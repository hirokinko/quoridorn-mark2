<template>
  <div class="container" ref="window-container">
    <simple-tab-component
      :windowKey="windowKey"
      :tabList="tabList"
      v-model="currentTabInfo"
    >
      <!-- メイン -->
      <div class="main" v-if="currentTabInfo.target === 'map' && sceneData">
        <div class="detail">
          <table class="info-table">
            <tr>
              <tr-string-input-component
                labelName="name"
                v-model="sceneData.name"
                inputWidth="10em"
              />
            </tr>
          </table>

          <fieldset>
            <legend v-t="'label.size'"></legend>
            <table class="info-table">
              <tr>
                <tr-number-input-component
                  labelName="columns"
                  v-model="sceneData.columns"
                  inputWidth="3.5em"
                  :min="1"
                />
              </tr>
              <tr>
                <tr-number-input-component
                  labelName="rows"
                  v-model="sceneData.rows"
                  inputWidth="3.5em"
                  :min="1"
                />
              </tr>
              <tr>
                <tr-number-input-component
                  labelName="grid-size"
                  v-model="sceneData.gridSize"
                  inputWidth="3.5em"
                  :min="1"
                />
              </tr>
            </table>
          </fieldset>

          <fieldset>
            <legend v-t="'label.decoration'"></legend>
            <table class="info-table">
              <tr>
                <tr-color-picker-component
                  labelName="font-color"
                  v-model="sceneData.fontColor"
                />
              </tr>
              <tr>
                <tr-color-picker-component
                  labelName="grid-line-color"
                  v-model="sceneData.gridColor"
                />
              </tr>
            </table>
          </fieldset>
        </div>

        <fieldset class="texture">
          <legend v-t="'label.texture'"></legend>
          <input-texture-component
            :key="1"
            v-model="sceneData.texture"
            :windowKey="key"
            :defaultTag="defaultTag"
          />
        </fieldset>
      </div>

      <!-- 余白 -->
      <div
        class="margin"
        v-if="currentTabInfo.target === 'margin' && sceneData"
      >
        <div class="detail">
          <fieldset>
            <legend v-t="'label.size'"></legend>
            <table class="info-table">
              <tr>
                <tr-number-input-component
                  labelName="columns"
                  v-model="sceneData.margin.columns"
                  inputWidth="3.5em"
                  :min="0"
                />
              </tr>
              <tr>
                <tr-number-input-component
                  labelName="rows"
                  v-model="sceneData.margin.rows"
                  inputWidth="3.5em"
                  :min="0"
                />
              </tr>
            </table>
          </fieldset>

          <fieldset>
            <legend v-t="'label.grid-line'"></legend>
            <table class="info-table">
              <tr>
                <tr-checkbox-component
                  labelName="grid-line"
                  :cLabel="$t('label.exist')"
                  :nLabel="$t('label.not-exist')"
                  v-model="sceneData.margin.isUseGrid"
                />
              </tr>
              <tr>
                <tr-color-picker-component
                  labelName="main"
                  v-model="sceneData.margin.gridColorBold"
                />
              </tr>
              <tr>
                <tr-color-picker-component
                  labelName="sub"
                  v-model="sceneData.margin.gridColorThin"
                  :disabled="!sceneData.margin.isUseGrid"
                />
              </tr>
            </table>
          </fieldset>

          <fieldset>
            <legend v-t="'label.mask'"></legend>
            <table class="info-table">
              <tr>
                <tr-color-picker-component
                  labelName="color"
                  v-model="sceneData.margin.maskColor"
                />
              </tr>
              <tr>
                <tr-number-input-component
                  labelName="blur"
                  v-model="sceneData.margin.maskBlur"
                  inputWidth="3.5em"
                  :min="0"
                />
              </tr>
            </table>
          </fieldset>

          <fieldset>
            <legend v-t="'label.frame-border'"></legend>
            <table class="info-table">
              <tr>
                <tr-number-input-component
                  labelName="width"
                  v-model="sceneData.margin.border.width"
                  inputWidth="3.5em"
                  :min="0"
                />
              </tr>
              <tr>
                <tr-color-picker-component
                  class="value-border-color"
                  labelName="color"
                  v-model="sceneData.margin.border.color"
                />
              </tr>
              <tr>
                <th>
                  <label
                    :for="`${key}-border-style`"
                    class="label-border-style label-input"
                    v-t="'label.style'"
                  >
                  </label>
                </th>
                <td>
                  <border-style-select
                    :id="`${key}-border-style`"
                    v-model="sceneData.margin.border.style"
                  />
                </td>
              </tr>
            </table>
          </fieldset>
        </div>

        <fieldset class="texture">
          <legend v-t="'label.texture'"></legend>
          <input-texture-component
            :key="2"
            v-model="sceneData.margin.texture"
            :windowKey="key"
            :defaultTag="defaultTag"
          />
        </fieldset>
      </div>

      <!-- 背景 -->
      <div
        class="background"
        v-if="currentTabInfo.target === 'background' && sceneData"
      >
        <fieldset class="texture">
          <legend v-t="'label.texture'"></legend>
          <input-texture-component
            :key="3"
            v-model="sceneData.background.texture"
            :windowKey="key"
            :defaultTag="defaultTag"
          />
        </fieldset>
      </div>

      <!-- レイヤー -->
      <div class="layer" v-if="currentTabInfo.target === 'layer'">
        <edit-scene-layer-chooser-component
          :sceneId="sceneId"
          v-model="selectedLayerId"
          @hoverView="onHoverLayerView"
          @hoverOrder="onHoverOrderLayer"
          @hoverOrderMode="onHoverLayerOrderMode"
        />
        <edit-scene-object-chooser-component
          :sceneId="sceneId"
          :selectedLayerId="selectedLayerId"
          v-model="selectedSceneObjectId"
          @hoverAddress="onHoverAddress"
          @hoverOrder="onHoverOrderObject"
          @hoverOrderMode="onHoverObjectOrderMode"
        />
      </div>
    </simple-tab-component>
  </div>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import { Mixins } from "vue-mixin-decorator";
import { Task, TaskResult } from "task";
import TaskProcessor from "../../core/task/TaskProcessor";
import LifeCycle from "../../core/decorator/LifeCycle";
import { SceneObject } from "../../../@types/gameObject";
import { Scene, SceneAndLayer, SceneLayer } from "../../../@types/room";
import AddressInput from "../common/components/AddressInput.vue";
import EditSceneObjectChooserComponent from "./EditSceneObjectChooserComponent.vue";
import ColorPickerComponent from "../../core/component/ColorPickerComponent.vue";
import BorderStyleSelect from "../common/components/select/BorderStyleSelect.vue";
import { StoreUseData } from "../../../@types/store";
import WindowVue from "../../core/window/WindowVue";
import ImagePickerComponent from "../../core/component/ImagePickerComponent.vue";
import TrStringInputComponent from "../common/components/TrStringInputComponent.vue";
import GameObjectManager from "../GameObjectManager";
import EditSceneLayerChooserComponent from "./EditSceneLayerChooserComponent.vue";
import { TabInfo } from "../../../@types/window";
import TrNumberInputComponent from "../common/components/TrNumberInputComponent.vue";
import SeekBarComponent from "../cut-in/bgm/SeekBarComponent.vue";
import SocketFacade, {
  permissionCheck
} from "../../core/api/app-server/SocketFacade";
import TrColorPickerComponent from "../common/components/TrColorPickerComponent.vue";
import VueEvent from "../../core/decorator/VueEvent";
import InputTextureComponent from "./InputTextureComponent.vue";
import TaskManager from "../../core/task/TaskManager";
import TrCheckboxComponent from "../common/components/TrCheckboxComponent.vue";
import CtrlButton from "../../core/component/CtrlButton.vue";
import BackgroundTypeRadio from "../common/components/radio/BackgroundTypeRadio.vue";
import LanguageManager from "../../../LanguageManager";
import SceneLayerSelect from "../common/components/select/SceneLayerSelect.vue";
import SimpleTabComponent from "../../core/component/SimpleTabComponent.vue";

@Component({
  components: {
    TrCheckboxComponent,
    EditSceneObjectChooserComponent,
    EditSceneLayerChooserComponent,
    TrColorPickerComponent,
    TrNumberInputComponent,
    TrStringInputComponent,
    AddressInput,
    BorderStyleSelect,
    InputTextureComponent,
    ImagePickerComponent,
    BackgroundTypeRadio,
    SceneLayerSelect,
    SimpleTabComponent,
    ColorPickerComponent,
    SeekBarComponent,
    CtrlButton
  }
})
export default class EditSceneWindow extends Mixins<WindowVue<string, never>>(
  WindowVue
) {
  private isMounted: boolean = false;
  private isProcessed: boolean = false;
  private sceneId: string | null = null;
  private oldSceneId: string | null = null;
  private defaultTag: string = LanguageManager.instance.getText("type.map");

  private sceneList = GameObjectManager.instance.sceneList;
  private layerList = GameObjectManager.instance.sceneLayerList;
  private sceneAndLayerList = GameObjectManager.instance.sceneAndLayerList;
  private sceneObjectList = GameObjectManager.instance.sceneObjectList;

  private cc = SocketFacade.instance.sceneListCC();

  private sceneInfo: StoreUseData<Scene> | null = null;
  private sceneData: Scene | null = null;
  private sceneAndLayerInfoList: StoreUseData<SceneAndLayer>[] | null = null;
  private sceneObjectInfoList: StoreUseData<SceneObject>[] | null = null;
  private layerInfoList: StoreUseData<SceneLayer>[] | null = null;

  private selectedLayerId: string = "";
  private selectedSceneObjectId: string = "";

  @Watch("sceneObjectList", { deep: true })
  @Watch("selectedLayerId")
  private async onChangeSceneObjectInfoList() {
    setTimeout(async () => {
      type SceneObjectList = StoreUseData<SceneObject>[];
      const oldList: SceneObjectList = [];

      if (this.sceneObjectInfoList) {
        oldList.push(...this.sceneObjectInfoList.concat());
      }
      this.sceneObjectInfoList = this.sceneObjectList.filter(
        mo => mo.data!.layerId === this.selectedLayerId
      );

      const clearFocusList: SceneObjectList = oldList.filter(
        o => this.sceneObjectInfoList!.findIndex(so => so.id === o.id) < 0
      );
      const setFocusList: SceneObjectList = this.sceneObjectInfoList!.filter(
        so => oldList.findIndex(o => o.id === so.id) < 0
      );

      const focusFunc = async (id: string, isFocus: boolean): Promise<void> => {
        await EditSceneWindow.changeFocus(id, isFocus);
      };

      // 直列の非同期で全部実行する
      await clearFocusList
        .map(obj => () => focusFunc(obj.id!, false))
        .reduce((prev, curr) => prev.then(curr), Promise.resolve());

      // 直列の非同期で全部実行する
      await setFocusList
        .map(obj => () => focusFunc(obj.id!, true))
        .reduce((prev, curr) => prev.then(curr), Promise.resolve());
    });
  }

  @Watch("selectedLayerId")
  private async onChangeSelectedLayerId() {
    this.selectedSceneObjectId = "";
  }

  @Watch("selectedSceneObjectId")
  private async onChangeSelectedSceneObjectId(newVal: string, oldVal: string) {
    const focusFunc = async (id: string, isFocus: boolean): Promise<void> => {
      await EditSceneWindow.changeFocus(id, isFocus);
    };

    await focusFunc(oldVal, false);

    if (!this.sceneObjectInfoList) {
      await focusFunc(newVal, true);
      return;
    }

    type SceneObjectList = StoreUseData<SceneObject>[];

    const clearFocusList: SceneObjectList = this.sceneObjectInfoList.filter(
      so => so.id !== newVal
    );

    // 直列の非同期で全部実行する
    await clearFocusList
      .map(obj => () => focusFunc(obj.id!, false))
      .reduce((prev, curr) => prev.then(curr), Promise.resolve());

    if (this.sceneObjectInfoList.findIndex(so => so.id === newVal) < 0) {
      await focusFunc(newVal, true);
    }

    this.sceneObjectInfoList = null;
  }

  @Watch("windowInfo.status")
  private async onChangeWindowInfoStatus() {
    await this.focusAll(false);
    if (this.windowInfo.status === "window") {
      setTimeout(async () => {
        await this.focusAll(true);
      });
    }
  }

  @Watch("currentTabInfo.target")
  private async onChangeTabTarget() {
    if (this.currentTabInfo && this.currentTabInfo.target !== "layer") {
      await this.focusAll(false);
    } else {
      this.selectedLayerId = "";
    }
  }

  private async focusAll(isFocus: boolean) {
    const targetList: string[] = this.sceneObjectInfoList
      ? this.sceneObjectInfoList.map(so => so.id!)
      : [];
    if (this.selectedSceneObjectId) targetList.push(this.selectedSceneObjectId);

    // 直列の非同期で全部実行する
    await targetList
      .map(id => () => EditSceneWindow.changeFocus(id, isFocus))
      .reduce((prev, curr) => prev.then(curr), Promise.resolve());
  }

  private static async changeFocus(id: string, isFocus: boolean) {
    if (!id) return;
    await TaskManager.instance.ignition<
      { id: string; isFocus: boolean },
      never
    >({
      type: "change-focus-scene-object",
      owner: "Quoridorn",
      value: {
        id,
        isFocus
      }
    });
  }

  @Watch("sceneData", { deep: true })
  private async onChangeSceneData(newValue: Scene, oldValue: Scene | null) {
    if (oldValue === null) return;

    try {
      await this.cc.update(
        [this.sceneId!],
        [this.sceneData!],
        [{ continuous: true }]
      );
    } catch (err) {
      console.log("==========");
      console.log(err);
    }
  }

  private tabList: TabInfo[] = [
    { key: "1", target: "map", text: "" },
    { key: "2", target: "margin", text: "" },
    { key: "3", target: "background", text: "" },
    { key: "4", target: "layer", text: "" }
  ];
  private currentTabInfo: TabInfo | null = this.tabList[0];

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

  private createTabInfoList() {
    this.tabList.forEach(t => {
      t.text = this.$t(`label.${t.target}`)!.toString();
    });
  }

  @LifeCycle
  private async mounted() {
    await this.init();
    this.isMounted = true;
    this.sceneId = this.windowInfo.args!;
    this.sceneInfo = this.sceneList.filter(map => map.id === this.sceneId)[0];
    this.sceneData = this.sceneInfo.data!;

    this.oldSceneId = GameObjectManager.instance.roomData.sceneId;
    GameObjectManager.instance.roomData.sceneId = this.sceneId;

    setTimeout(() => {
      GameObjectManager.instance.isSceneEditing = true;
    });

    this.sceneAndLayerInfoList = this.sceneAndLayerList
      .filter(map => map.data!.sceneId === this.sceneId)
      .sort((m1, m2) => {
        if (m1.order < m2.order) return -1;
        if (m1.order > m2.order) return 1;
        return 0;
      });
    this.layerInfoList = this.sceneAndLayerInfoList
      .map(ml => this.layerList.filter(l => l.id === ml.data!.layerId)[0])
      .filter(l => l);

    if (this.windowInfo.status === "window") {
      // 排他チェック
      if (this.sceneInfo.exclusionOwner) {
        this.isProcessed = true;
        await this.close();
        return;
      }

      // パーミッションチェック
      if (!permissionCheck(this.sceneInfo, "edit")) {
        this.isProcessed = true;
        await this.close();
        return;
      }
    }

    // this.foreColor = sceneData.gridBorderColor;

    if (this.windowInfo.status === "window") {
      try {
        await this.cc.touchModify([this.sceneId]);
      } catch (err) {
        this.isProcessed = true;
        console.warn(err);
        await this.close();
      }
    }
  }

  @TaskProcessor("window-close-closing")
  private async windowCloseClosing2(
    task: Task<string, never>
  ): Promise<TaskResult<never> | void> {
    if (task.value !== this.windowInfo.key) return;
    await this.focusAll(false);
    GameObjectManager.instance.isSceneEditing = false;

    GameObjectManager.instance.roomData.sceneId =
      GameObjectManager.instance.sceneEditingUpdateSceneId || this.oldSceneId!;
    GameObjectManager.instance.sceneEditingUpdateSceneId = null;
    if (!this.isProcessed) {
      try {
        await this.cc!.releaseTouch([this.sceneId!]);
      } catch (err) {
        // nothing
      }
    }
  }

  private setHoverWindowMessage(isHover: boolean, messageType: string) {
    this.windowInfo.message = isHover
      ? LanguageManager.instance.getText(
          `${this.windowInfo.type}.message-select.${messageType}`
        )
      : "";
  }

  @VueEvent
  private onHoverLayerView(isHover: boolean) {
    this.setHoverWindowMessage(isHover, "layer-view");
  }

  @VueEvent
  private onHoverAddress(isHover: boolean) {
    this.setHoverWindowMessage(isHover, "original-address");
  }

  @VueEvent
  private onHoverOrderLayer(isHover: boolean) {
    this.setHoverWindowMessage(isHover, "layer-order");
  }

  @VueEvent
  private onHoverOrderObject(isHover: boolean) {
    this.setHoverWindowMessage(isHover, "object-order");
  }

  @VueEvent
  private onHoverLayerOrderMode(isHover: boolean, dragMode: boolean) {
    const messageType = `layer-order-mode-${dragMode ? "off" : "on"}`;
    this.setHoverWindowMessage(isHover, messageType);
  }

  @VueEvent
  private onHoverObjectOrderMode(isHover: boolean, dragMode: boolean) {
    const messageType = `object-order-mode-${dragMode ? "off" : "on"}`;
    this.setHoverWindowMessage(isHover, messageType);
  }
}
</script>

<style scoped lang="scss">
@import "../../../assets/common";

.container {
  height: 100%;
}

.value-name {
  width: 10em;
}

.value-rows,
.value-columns,
.value-grid-size,
.value-margin-rows,
.value-margin-columns,
.value-mask-blur {
  width: 3.5em;
}

.simple-tab-component {
  height: 100%;

  > *:not(:first-child) {
    @include flex-box(row, flex-start, stretch);
    width: 100%;
    flex: 1;
    border: 1px solid gray;
    box-sizing: border-box;
    padding: 0.5rem;
    overflow: auto;
  }

  table {
    box-sizing: border-box;

    th,
    td {
      box-sizing: border-box;
      padding: 0;
    }

    th {
      text-align: right;
    }
    td {
      text-align: left;
    }
  }

  input[type="checkbox"] {
    display: inline-block;
    margin: 0;
    height: calc(2em - 2px);
  }

  fieldset {
    margin: 0;
    box-sizing: border-box;
    padding: 0.25rem;
    border: 1px solid lightgray;
    overflow-x: auto;
    overflow-y: auto;

    > :not(legend) {
      height: calc(100% - 1.5em);
    }
  }

  .background {
    width: 100%;
    height: 100%;

    .texture {
      width: 100%;
      height: 100%;
    }
  }

  .main,
  .margin {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: auto 1fr;

    .detail {
      grid-row: 1 / 2;
      grid-column: 1 / 2;
      @include flex-box(column, flex-start, stretch);
      margin-right: 0.5rem;
    }

    .texture {
      grid-row: 1 / 2;
      grid-column: 2 / 3;
    }
  }
}
</style>
