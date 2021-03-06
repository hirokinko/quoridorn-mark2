<template>
  <tr class="tr-number-input-component">
    <th class="label-input">
      <label :for="key" v-t="`label.${labelName}`"></label>
    </th>
    <td>
      <input
        :id="key"
        type="number"
        :value="localValue"
        :disabled="disabled"
        @input="localValue = $event.target.valueAsNumber"
        :min="min"
        :max="max"
        :step="step"
        ref="inputElm"
        @keydown.enter.stop
        @keyup.enter.stop
        @keydown.229.stop
        @keyup.229.stop
      />
      <span v-if="unitLabel" v-t="`label.${unitLabel}`"></span>
    </td>
  </tr>
</template>

<script lang="ts">
import { Prop } from "vue-property-decorator";
import { Component, Mixins } from "vue-mixin-decorator";
import ComponentVue from "../../../core/window/ComponentVue";
import BaseInput from "../../../core/component/BaseInput.vue";

@Component({ components: { BaseInput } })
export default class TrNumberInputComponent extends Mixins<ComponentVue>(
  ComponentVue
) {
  @Prop({ type: String, required: true })
  private labelName!: string;

  @Prop({ type: Number })
  private step: number | undefined;

  @Prop({ type: Number })
  private min: number | undefined;

  @Prop({ type: Number })
  private max: number | undefined;

  @Prop({ type: Number, required: true })
  private value!: number;

  @Prop({ type: Boolean, default: false })
  private disabled!: boolean;

  @Prop({ type: String, default: "" })
  private inputWidth!: string;

  @Prop({ type: String, default: "" })
  private unitLabel!: string;

  private mounted() {
    if (this.inputWidth) {
      const inputElm = this.$refs.inputElm as HTMLInputElement;
      inputElm.style.width = this.inputWidth;
    }
  }

  private input(value: number) {
    this.$emit("input", value);
  }

  public get localValue(): number {
    return this.value;
  }
  public set localValue(value: number) {
    this.input(value);
  }
}
</script>

<style scoped lang="scss">
.tr-color-picker-component {
  display: contents;
}
th,
td {
  padding: 0;
}

th {
  text-align: left;
  width: 1px;
  white-space: nowrap;

  :first-child {
    display: inline-block;
    width: calc(100% - 1em);
  }
}

tr {
  display: contents;
}

input {
  font-size: inherit;
  height: 2em;
  box-sizing: border-box;
  margin: 0;

  &:read-only {
    outline: none;
  }

  &:disabled {
    background-color: lightgray;
  }
}
</style>
