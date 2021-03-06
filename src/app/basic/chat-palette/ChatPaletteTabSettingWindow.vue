<template>
  <div class="container" ref="window-container">
    <simple-tab-component
      :windowKey="windowKey"
      :tabList="tabList"
      v-model="currentTabInfo"
    >
      <!-- タブリストタブ -->
      <div class="tab-container" v-if="currentTabInfo.target === 'tab-list'">
        <draggable
          :options="{
            animation: 10,
            handle: dragMode ? '' : '.anonymous'
          }"
          class="draggable-box"
          v-model="filteredTabList"
          @start="onSortStart()"
          @end="onSortEnd()"
          @sort="onSortOrderChange()"
        >
          <template v-for="tab in filteredTabList">
            <chat-palette-tab-component
              :key="tab.id"
              :tab="tab"
              :dragMode="dragMode"
              :changeOrderId="changeOrderId"
              @hover="onHover"
              @edit="editTab"
              @chmod="chmodTab"
              @delete="deleteTab"
            />
          </template>
        </draggable>
      </div>

      <div class="button-area" v-if="currentTabInfo.target === 'tab-list'">
        <ctrl-button @click="addTab()">
          <span v-t="'button.add'"></span>
        </ctrl-button>
        <s-check
          class="sort-check"
          v-model="dragMode"
          colorStyle="skyblue"
          c-icon="checkmark"
          :c-label="$t('label.sort')"
          n-icon=""
          :n-label="$t('label.sort')"
          @hover="onHoverView"
        />
      </div>
    </simple-tab-component>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { Mixins } from "vue-mixin-decorator";
import draggable from "vuedraggable";
import { Task, TaskResult } from "task";
import { ModeInfo } from "mode";
import { ChatPaletteStore } from "@/@types/gameObject";
import WindowVue from "../../core/window/WindowVue";
import SocketFacade, {
  permissionCheck
} from "../../core/api/app-server/SocketFacade";
import { StoreUseData } from "@/@types/store";
import TaskManager from "../../core/task/TaskManager";
import GameObjectManager from "../GameObjectManager";
import { TabInfo, WindowOpenInfo } from "@/@types/window";
import LanguageManager from "../../../LanguageManager";
import TrCheckboxComponent from "../common/components/TrCheckboxComponent.vue";
import CtrlButton from "../../core/component/CtrlButton.vue";
import SCheck from "../common/components/SCheck.vue";
import ChatTabComponent from "../chat/tab/ChatTabComponent.vue";
import SimpleTabComponent from "../../core/component/SimpleTabComponent.vue";
import TaskProcessor from "@/app/core/task/TaskProcessor";
import LifeCycle from "@/app/core/decorator/LifeCycle";
import VueEvent from "@/app/core/decorator/VueEvent";
import ChatPaletteTabComponent from "@/app/basic/chat-palette/ChatPaletteTabComponent.vue";
import App from "@/views/App.vue";
import { DataReference } from "@/@types/data";

@Component({
  components: {
    ChatPaletteTabComponent,
    SimpleTabComponent,
    ChatTabComponent,
    TrCheckboxComponent,
    SCheck,
    CtrlButton,
    draggable
  }
})
export default class ChatPaletteTabSettingWindow extends Mixins<
  WindowVue<void, void>
>(WindowVue) {
  public chatPaletteList = GameObjectManager.instance.chatPaletteList;
  private filteredTabList: StoreUseData<ChatPaletteStore>[] = [];
  private chatPaletteListCC = SocketFacade.instance.chatPaletteListCC();

  private dragMode = false;
  private changeOrderId: string = "";
  private dragModeProcessed: boolean = false;
  private orderChangingIdList: string[] = [];

  private tabList: TabInfo[] = [{ key: "1", target: "tab-list", text: "" }];
  private currentTabInfo: TabInfo = this.tabList[0];

  @Watch("chatPaletteList", { immediate: true, deep: true })
  private onChangeChatPaletteList() {
    this.filteredTabList = this.chatPaletteList.filter(ct =>
      permissionCheck(ct, "view")
    );
  }

  @TaskProcessor("language-change-finished")
  private async languageChangeFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    this.createTabInfoList();
    task.resolve();
  }

  @LifeCycle
  private async created() {
    this.createTabInfoList();
  }

  @LifeCycle
  public async mounted() {
    await this.init();
  }

  private createTabInfoList() {
    this.tabList.forEach(t => {
      t.text = this.$t(`label.${t.target}`)!.toString();
    });
  }

  @VueEvent
  private async editTab(tabInfo: StoreUseData<ChatPaletteStore>) {
    await TaskManager.instance.ignition<WindowOpenInfo<DataReference>, null>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "chat-palette-edit-window",
        args: {
          type: "chat-palette",
          docId: tabInfo.id!
        }
      }
    });
  }

  @VueEvent
  private async chmodTab(tabInfo: StoreUseData<ChatPaletteStore>) {
    await TaskManager.instance.ignition<WindowOpenInfo<DataReference>, void>({
      type: "window-open",
      owner: "Quoridorn",
      value: {
        type: "chmod-window",
        args: {
          type: "chat-palette",
          docId: tabInfo.id!
        }
      }
    });
  }

  private static getDialogMessage(target: string): string {
    const msgTarget = "chat-palette-tab-setting-window.message-list." + target;
    return LanguageManager.instance.getText(msgTarget);
  }

  @VueEvent
  private async deleteTab(tabInfo: StoreUseData<ChatPaletteStore>) {
    const msg = ChatPaletteTabSettingWindow.getDialogMessage(
      "delete-tab"
    ).replace("$1", tabInfo.data!.name);
    const result = window.confirm(msg);
    if (!result) return;

    try {
      await this.chatPaletteListCC.deletePackage([tabInfo.id!]);
    } catch (err) {
      // TODO error message.
      return;
    }
  }

  @VueEvent
  private async addTab() {
    await App.openSimpleWindow("chat-palette-add-window");
  }

  @VueEvent
  private getExclusionOwner(exclusionOwner: string) {
    return GameObjectManager.instance.getExclusionOwnerName(exclusionOwner);
  }

  @VueEvent
  private onHover(messageType: string, isHover: boolean) {
    this.windowInfo.message = isHover
      ? LanguageManager.instance.getText(
          `chat-setting-window.message-list.${messageType}`
        )
      : "";
  }

  @Watch("dragMode")
  private async onChangeDragMode() {
    this.$emit("onChangeDragMode", this.dragMode);

    const idList: string[] = this.filteredTabList.map(ct => ct.id!);
    if (this.dragMode) {
      let error: boolean = false;

      try {
        await this.chatPaletteListCC.touchModify(idList);
      } catch (err) {
        error = true;
        alert("Failure to get sceneAndLayerList's lock.\nPlease try again.");
      }

      if (error) {
        this.dragModeProcessed = true;
        this.dragMode = false;
        this.orderChangingIdList = [];
      } else {
        this.orderChangingIdList = idList;
      }
    } else {
      this.orderChangingIdList = [];
      console.log(this.dragModeProcessed);
      if (!this.dragModeProcessed) {
        await this.chatPaletteListCC.releaseTouch(idList);
        console.log("releaseTouched", idList);
        this.dragModeProcessed = false;
      }
    }
  }

  @TaskProcessor("window-close-closing")
  private async windowCloseClosing2(
    task: Task<string, never>
  ): Promise<TaskResult<never> | void> {
    if (task.value !== this.windowInfo.key) return;
    if (this.dragMode && !this.dragModeProcessed) {
      const idList: string[] = this.filteredTabList.map(ct => ct.id!);
      await this.chatPaletteListCC.releaseTouch(idList);
      this.dragModeProcessed = false;
    }
  }

  @VueEvent
  private async onSortStart() {
    await TaskManager.instance.ignition<ModeInfo, never>({
      type: "mode-change",
      owner: "Quoridorn",
      value: { type: "special-drag", value: "on" as "on" }
    });
  }

  @VueEvent
  private async onSortOrderChange() {
    console.log("onEndOrderChange");
    const idOrderList = this.filteredTabList.map(ct => ({
      id: ct.id!,
      order: ct.order,
      target: false
    }));
    const orderList = idOrderList.concat().map(ido => ido.order);
    orderList.sort((o1, o2) => {
      if (o1 < o2) return -1;
      if (o1 > o2) return 1;
      return 0;
    });
    idOrderList.forEach((ido, idx: number) => {
      if (ido.order !== orderList[idx]) ido.target = true;
      ido.order = orderList[idx];
    });

    const idList: string[] = [];
    const dataList: ChatPaletteStore[] = [];
    const optionList: any = [];
    this.filteredTabList.forEach((obj, idx) => {
      if (!idOrderList[idx].target) return;
      const id = idOrderList[idx].id;
      const order = idOrderList[idx].order;
      const data = this.filteredTabList.filter(ct => ct.id === id)[0].data!;
      idList.push(id);
      dataList.push(data);
      optionList.push({
        order,
        continuous: true
      });
    });

    await this.chatPaletteListCC.update(idList, dataList, optionList);
  }

  @VueEvent
  private async onSortEnd() {
    await TaskManager.instance.ignition<ModeInfo, never>({
      type: "mode-change",
      owner: "Quoridorn",
      value: { type: "special-drag", value: "off" as "off" }
    });
    this.changeOrderId = "";
  }

  @VueEvent
  private onHoverView(isHover: boolean) {
    if (isHover) this.$emit("onMouseHoverView", true);
    else {
      if (this.dragMode) this.$emit("onMouseHoverOrder", true);
      else this.$emit("onMouseHoverView", false);
    }
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";

.container {
  @include flex-box(column, stretch, flex-start);
  width: 100%;
  height: 100%;
}

.simple-tab-component {
  @include flex-box(column, stretch, flex-start);
  width: 100%;
  height: 100%;
}

.other-block {
  border: solid 1px gray;
  height: 100%;
  box-sizing: border-box;
  padding: 0.2rem;
}

.tab-container {
  @include flex-box(column, stretch, flex-start);
  flex: 1;
  background-color: white;
  overflow-y: scroll;
  border: solid 1px gray;
}

.draggable-box {
  display: contents;
}

.tab-info {
  @include flex-box(row, flex-start, center);
  position: relative;
  height: 2em;
  min-height: 2em;
  padding: 0 0.3rem;
  border-bottom: 1px dotted var(--uni-color-gray);
  box-sizing: border-box;

  &.tab-all {
    @include btn-skyblue();
  }
}

.icon-menu {
  visibility: hidden;
}

.check-box {
  @include flex-box(row, flex-start, center);
  position: absolute;
  right: 0.3rem;
  top: 0;
  bottom: 0;
}
</style>
