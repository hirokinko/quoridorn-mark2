<template>
  <ctrl-select
    :optionInfoList="optionInfoList"
    :disabled="disabled"
    :readonly="readonly"
    :name="`chat-color-type-select-${key}`"
    v-model="localValue"
    ref="component"
  />
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import { Task, TaskResult } from "task";
import { Mixins } from "vue-mixin-decorator";
import CtrlSelect from "../../../../core/component/CtrlSelect.vue";
import LifeCycle from "../../../../core/decorator/LifeCycle";
import TaskProcessor from "../../../../core/task/TaskProcessor";
import ComponentVue from "../../../../core/window/ComponentVue";
import { HtmlOptionInfo } from "../../../../../@types/window";

@Component({
  components: { CtrlSelect }
})
export default class ChatColorTypeSelect extends Mixins<ComponentVue>(
  ComponentVue
) {
  @Prop({ type: String, default: "owner" })
  public value!: string;

  @Prop({ type: Boolean, default: false })
  public disabled!: boolean;

  @Prop({ type: Boolean, default: false })
  public readonly!: boolean;

  public input(value: string) {
    this.$emit("input", value);
  }

  private get localValue(): string {
    return this.value || "";
  }

  private set localValue(value: string) {
    this.input(value);
  }

  private optionInfoList: HtmlOptionInfo[] = [
    { value: "owner", key: "", text: "", disabled: false },
    { value: "original", key: "", text: "", disabled: false }
  ];

  @LifeCycle
  private created() {
    this.createOptionInfoList();
  }

  @TaskProcessor("language-change-finished")
  private async languageChangeFinished(
    task: Task<never, never>
  ): Promise<TaskResult<never> | void> {
    this.createOptionInfoList();
    task.resolve();
  }

  private createOptionInfoList() {
    this.optionInfoList.forEach(o => {
      o.text = this.$t(`option.chat-color-type.${o.value}`)!.toString();
      o.key = o.value;
    });
  }

  public focus() {
    const elm = this.$refs.component as CtrlSelect;
    elm.focus();
  }
}
</script>
