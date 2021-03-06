<template>
  <div class="container" ref="window-container">
    <chat-tab-info-form
      :windowKey="windowKey"
      :isAdd="true"
      initTabTarget="basic"
      :tabName.sync="tabName"
      :useReadAloud.sync="useReadAloud"
      :readAloudVolume.sync="readAloudVolume"
    />

    <div class="button-area">
      <ctrl-button @click="commit()" :disabled="isDuplicate || !tabName">
        <span v-t="'button.add'"></span>
      </ctrl-button>
      <ctrl-button @click="rollback()">
        <span v-t="'button.reject'"></span>
      </ctrl-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { Mixins } from "vue-mixin-decorator";
import GameObjectManager from "../../GameObjectManager";
import WindowVue from "../../../core/window/WindowVue";
import LifeCycle from "../../../core/decorator/LifeCycle";
import SocketFacade from "../../../core/api/app-server/SocketFacade";
import LanguageManager from "../../../../LanguageManager";
import VueEvent from "../../../core/decorator/VueEvent";
import TaskProcessor from "../../../core/task/TaskProcessor";
import { Task, TaskResult } from "task";
import CtrlButton from "../../../core/component/CtrlButton.vue";
import { PermissionNode } from "../../../../@types/store";
import ChatTabInfoForm from "./ChatTabInfoForm.vue";

@Component({
  components: { ChatTabInfoForm, CtrlButton }
})
export default class ChatTabAddWindow extends Mixins<WindowVue<string, never>>(
  WindowVue
) {
  private chatTabList = GameObjectManager.instance.chatTabList;
  private actorGroupList = GameObjectManager.instance.actorGroupList;
  private isProcessed: boolean = false;
  private cc = SocketFacade.instance.chatTabListCC();

  private tabName: string = "";
  private useReadAloud: boolean = false;
  private readAloudVolume: number = 0.5;

  @LifeCycle
  public async mounted() {
    await this.init();
    this.inputEnter("input:not([type='button'])", this.commit);
  }

  private get isDuplicate(): boolean {
    return (
      this.chatTabList.filter(ct => ct.data!.name === this.tabName).length > 0
    );
  }

  @Watch("isDuplicate")
  private onChangeIsDuplicate() {
    this.windowInfo.message = this.isDuplicate
      ? ChatTabAddWindow.getDialogMessage("duplicate")
      : ChatTabAddWindow.getDialogMessage("default");
  }

  private static getDialogMessage(target: string) {
    const msgTarget = "chat-tab-add-window.message-list." + target;
    return LanguageManager.instance.getText(msgTarget);
  }

  @VueEvent
  private async commit() {
    if (!this.isDuplicate) {
      const gameMastersActorGroup = this.actorGroupList.filter(
        ag => ag.data!.isSystem && ag.data!.name === "GameMasters"
      )[0];
      const gameMastersPermission: PermissionNode = {
        type: "group",
        id: gameMastersActorGroup.id!
      };
      await this.cc!.addDirect(
        [
          {
            name: this.tabName,
            isSystem: false,
            useReadAloud: this.useReadAloud,
            readAloudVolume: this.readAloudVolume
          }
        ],
        [
          {
            permission: {
              view: { type: "none", list: [] },
              edit: { type: "allow", list: [gameMastersPermission] },
              chmod: { type: "allow", list: [gameMastersPermission] }
            }
          }
        ]
      );
    }
    this.isProcessed = true;
    await this.close();
  }

  @TaskProcessor("window-close-closing")
  private async windowCloseClosing2(
    task: Task<string, never>
  ): Promise<TaskResult<never> | void> {
    if (task.value !== this.windowInfo.key) return;
    if (!this.isProcessed) {
      this.isProcessed = true;
      await this.rollback();
    }
  }

  @VueEvent
  private async rollback() {
    if (!this.isProcessed) {
      this.isProcessed = true;
      await this.close();
    }
  }
}
</script>

<style scoped lang="scss">
@import "../../../../assets/common";

.container {
  @include flex-box(column, flex-start, center);
  width: 100%;
  height: 100%;
}

.button-area {
  align-self: center;
}
</style>
