<template>
  <div ref="window-container">
    <div class="button-area space-between margin-bottom">
      <ctrl-button @click="send()" :disabled="!selectedCutInId">
        <span v-t="'button.send'"></span>
      </ctrl-button>
      <ctrl-button @click="preview" :disabled="!selectedCutInId">
        <span v-t="'button.preview'"></span>
      </ctrl-button>
    </div>

    <table-component
      class="table-component"
      :windowInfo="windowInfo"
      :tableIndex="0"
      :status="status"
      :dataList="cutInList"
      keyProp="id"
      :rowClassGetter="getRowClasses"
      v-model="selectedCutInId"
      @doubleClick="send"
      @adjustWidth="adjustWidth"
    >
      <template #contents="{ colDec, data, index }">
        <template v-if="index === 0">
          <span
            v-if="data.data.chatLinkageType !== 'none'"
            v-t="'label.exist'"
          ></span>
          <span v-else v-t="'label.not-exist'"></span>
        </template>
        <template v-else-if="index === 2">
          <i :class="data | icon"></i>
        </template>
        <template v-else-if="index === 4">{{ data | time }}</template>
        <template v-else-if="index === 5">
          <i class="icon-loop" v-if="data.data.url && data.data.isRepeat"></i>
          {{ data | isRepeat }}
        </template>
        <template v-else-if="index === 6">{{ data | volume }}</template>
        <template v-else-if="index === 7">{{ data | fade }}</template>
        <template v-else>
          {{ data.data[colDec.target] }}
        </template>
      </template>
    </table-component>

    <div class="button-area">
      <ctrl-button @click="addMusic">
        <span v-t="'button.add'"></span>
      </ctrl-button>
      <ctrl-button @click="editMusic" :disabled="isEditBan">
        <span v-t="'button.modify'"></span>
      </ctrl-button>
      <ctrl-button @click="chmodMusic" :disabled="isChmodBan">
        <span v-t="'button.chmod'"></span>
      </ctrl-button>
      <ctrl-button @click="copyMusic" :disabled="!selectedCutInId">
        <span v-t="'button.copy'"></span>
      </ctrl-button>
      <ctrl-button @click="deleteMusic" :disabled="isEditBan">
        <span v-t="'button.delete'"></span>
      </ctrl-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Emit } from "vue-property-decorator";
import CtrlButton from "@/app/core/component/CtrlButton.vue";
import WindowVue from "@/app/core/window/WindowVue";
import TableComponent from "@/app/core/component/table/TableComponent.vue";
import BgmManager from "@/app/basic/cut-in/bgm/BgmManager";
import LifeCycle from "@/app/core/decorator/LifeCycle";
import VueEvent from "@/app/core/decorator/VueEvent";
import { Mixins } from "vue-mixin-decorator";
import { StoreUseData } from "@/@types/store";
import SocketFacade, {
  permissionCheck
} from "@/app/core/api/app-server/SocketFacade";
import { CutInDeclareInfo } from "@/@types/room";
import { BgmPlayInfo } from "task-info";
import GameObjectManager from "@/app/basic/GameObjectManager";
import TaskManager from "@/app/core/task/TaskManager";
import { WindowOpenInfo, WindowResizeInfo } from "@/@types/window";
import { DataReference } from "@/@types/data";
import NekostoreCollectionController from "@/app/core/api/app-server/NekostoreCollectionController";
import TaskProcessor from "@/app/core/task/TaskProcessor";
import { Task, TaskResult } from "task";
import { getCssPxNum } from "@/app/core/css/Css";
import LanguageManager from "@/LanguageManager";

@Component({
  components: { TableComponent, CtrlButton },
  filters: {
    icon: (data: StoreUseData<CutInDeclareInfo>) => {
      if (!data.data!.url) return "icon-stop2";
      if (BgmManager.isYoutube(data.data!)) return "icon-youtube2";
      if (BgmManager.isDropbox(data.data!)) return "icon-dropbox";
      return "icon-file-music";
    },
    time: (data: StoreUseData<CutInDeclareInfo>) => {
      if (!data.data!.url) return "-";
      if (data.data!.start && data.data!.end)
        return `${data.data!.start}〜${data.data!.end}`;
      if (data.data!.start) return `${data.data!.start}〜`;
      if (data.data!.end) return `〜${data.data!.end}`;
      return "All";
    },
    isRepeat: (data: StoreUseData<CutInDeclareInfo>) =>
      data.data!.url && data.data!.isRepeat ? "" : "-",
    volume: (data: StoreUseData<CutInDeclareInfo>) =>
      data.data!.url ? data.data!.volume : "-",
    fade: (data: StoreUseData<CutInDeclareInfo>) => {
      if (!data.data!.url) return "-";
      if (data.data!.fadeIn > 0 && data.data!.fadeOut > 0) return "in/out";
      if (data.data!.fadeIn > 0 && data.data!.fadeOut === 0) return "in";
      if (data.data!.fadeIn === 0 && data.data!.fadeOut > 0) return "out";
      return "-";
    }
  }
})
export default class CutInListWindow extends Mixins<WindowVue<number, never>>(
  WindowVue
) {
  private selectedCutInId: string | null = null;
  private cutInList = GameObjectManager.instance.cutInList;
  private cc: NekostoreCollectionController<
    CutInDeclareInfo
  > = SocketFacade.instance.cutInDataCC();
  private fontSize: number = 12;

  private get elm(): HTMLElement {
    return this.$refs["window-container"] as HTMLElement;
  }

  @LifeCycle
  public async mounted() {
    await this.init();
  }

  @TaskProcessor("global-enter-finished")
  private async globalEnterFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    await this.send();
    task.resolve();
  }

  @VueEvent
  private async send(cutInId?: string) {
    const useId = cutInId || this.selectedCutInId;
    if (!useId) return;

    await SocketFacade.instance.sendData<BgmPlayInfo>({
      dataType: "bgm-play",
      data: {
        id: useId
      }
    });
  }

  private get cutInInfo(): StoreUseData<CutInDeclareInfo> | null {
    return this.cutInList.filter(c => c.id === this.selectedCutInId)[0];
  }

  private get isEditBan(): boolean {
    if (!this.cutInInfo) return true;
    if (this.cutInInfo.exclusionOwner) return true;
    return !permissionCheck(this.cutInInfo, "edit");
  }

  private get isChmodBan(): boolean {
    if (!this.cutInInfo) return true;
    return !permissionCheck(this.cutInInfo, "chmod");
  }

  @VueEvent
  private getRowClasses(
    data: StoreUseData<CutInDeclareInfo>,
    trElm: HTMLTableRowElement | null
  ): string[] {
    const classList: string[] = [];
    if (data.exclusionOwner) {
      classList.push("isEditing");
      const name = GameObjectManager.instance.getExclusionOwnerName(
        data.exclusionOwner
      );

      if (trElm) {
        trElm.style.setProperty(
          "--msg-locked",
          `"${LanguageManager.instance.getText("label.editing")}(${name})"`
        );
      }
    }
    return classList;
  }

  @Emit("adjustWidth")
  private adjustWidth(totalWidth: number) {
    if (this.windowInfo.declare.minSize)
      this.windowInfo.declare.minSize.widthPx = totalWidth;
    if (this.windowInfo.declare.maxSize)
      this.windowInfo.declare.maxSize.widthPx = totalWidth;
  }

  @TaskProcessor("window-font-size-finished")
  private async windowFontSizeFinished(
    task: Task<{ key: string; size: number }, never>
  ): Promise<TaskResult<never> | void> {
    if (task.value!.key !== this.windowInfo.key) return;
    this.fontSize = task.value!.size;
  }

  @TaskProcessor("window-resize-finished")
  private async windowResizeFinished(
    task: Task<WindowResizeInfo, never>
  ): Promise<TaskResult<never> | void> {
    if (task.value!.key !== this.windowKey) return;
    const remSize = getCssPxNum("font-size");
    const fontSize = this.fontSize;
    const heightPx = this.windowInfo.heightPx;
    const heightDiffPx = this.windowInfo.diffRect.height;
    const initHeightPx = this.windowInfo.declare.size.heightPx;
    let rowNum = (heightPx + heightDiffPx - initHeightPx) / (fontSize * 2);
    rowNum = Math.floor(rowNum) + 10;
    this.windowInfo.declare.tableInfoList[0].height = rowNum;
  }

  @VueEvent
  private async preview() {
    window.console.log("preview");
    await BgmManager.instance.callBgm({
      targetId: this.selectedCutInId!,
      data: null
    });
  }

  @VueEvent
  private async addMusic() {
    await TaskManager.instance.ignition<WindowOpenInfo<void>, never>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "bgm-add-window"
      }
    });
  }

  @VueEvent
  private async editMusic() {
    if (!this.selectedCutInId) return;
    await TaskManager.instance.ignition<WindowOpenInfo<DataReference>, never>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "bgm-edit-window",
        args: {
          type: "bgm",
          docId: this.selectedCutInId
        }
      }
    });
  }

  @VueEvent
  private async chmodMusic() {
    await TaskManager.instance.ignition<WindowOpenInfo<DataReference>, never>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "chmod-window",
        args: {
          type: "cut-in",
          docId: this.selectedCutInId!
        }
      }
    });
  }

  @VueEvent
  private async copyMusic() {
    if (!this.cutInInfo) return;
    await this.cc.addDirect([this.cutInInfo.data!]);
  }

  @VueEvent
  private async deleteMusic() {
    await this.cc.touchModify(this.selectedCutInId!);
    await this.cc.delete(this.selectedCutInId!);
    this.selectedCutInId = null;
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";
</style>