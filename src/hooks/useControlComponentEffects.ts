import {
  CtrlOptionValue,
} from "@src/feature/controls_panel/types/ControlOptions";
import { ControlComponentStateType } from "@src/feature/controls_panel/views/ControlComponentState";
import { FUNCTION_PARAMETERS } from "@src/feature/flow_chart_panel/manifest/PARAMETERS_MANIFEST";
import { ResultsType } from "@src/feature/results_panel/types/ResultsType";
import { useEffect } from "react";
import {
  ControlTypes,
} from "../feature/controls_panel/manifest/CONTROLS_MANIFEST";
import { CtlManifestType, CtrlManifestParam } from "./useFlowChartState";

const useControlComponentEffects = ({
  flowChartObject,
  setSelectedOption,
  ctrlObj,
  selectOptions,
  selectedOption,
  setCurrentInputValue,
  defaultValue,
  ctrls,
  setSelectOptions,
  setKnobValue,
  setTextInput,
  setNumberInput,
  setSliderInput,
  setNd,
  results
}: ControlComponentStateType & {
  ctrlObj: CtlManifestType;
  results: ResultsType;
}) => {

  useEffect(() => {
    setSelectedOption(
      ctrlObj.type === "output"
        ? selectOptions?.find((option) => option.value === ctrlObj?.param)!
        : selectOptions?.find(
            (option) =>
              (option.value as CtrlOptionValue).id ===
              (ctrlObj?.param as CtrlManifestParam)?.id
          )!
    );
  }, [
    ctrlObj?.param,
    (ctrlObj?.param as CtrlManifestParam)?.id,
    selectOptions,
    ctrlObj?.type,
  ]);

  useEffect(() => {
    setNumberInput("0");
    setTextInput("");
    setKnobValue(0);
    setSliderInput("0");
  }, [selectedOption]);
useEffect(() => {
    if (ctrls) {
      setCurrentInputValue(
        ctrls[(ctrlObj?.param as CtrlManifestParam)?.id!]?.value
      );
    } else {
      setCurrentInputValue(defaultValue as number);
    }
  }, [ctrls, ctrlObj, selectedOption]);

  useEffect(() => {
    if (ctrlObj.type === ControlTypes.Input) {
      if (flowChartObject!?.elements !== undefined) {
        flowChartObject!.elements.forEach((node) => {
          if (!("source" in node)) {
            // Object is a node, not an edge
            const nodeLabel = node.data!.label;
            const nodeFunctionName = node.data!.func;
            const params = FUNCTION_PARAMETERS[nodeFunctionName];
            const sep = " ▶ ";
            if (params) {
              Object.keys(params).forEach((param) => {
                setSelectOptions((prev) => [
                  ...prev,
                  {
                    label: nodeLabel + sep + param.toUpperCase(),
                    value: {
                      id:
                        nodeFunctionName +
                        "_" +
                        nodeLabel.toString().split(" ").join("") +
                        "_" +
                        param,
                      functionName: nodeFunctionName,
                      param,
                      nodeId: node.id,
                      inputId: ctrlObj.id,
                    },
                  },
                ]);
              });
            }
          }
        });
      }
    } else if (ctrlObj.type === ControlTypes.Output) {
      if (flowChartObject!?.elements !== undefined) {
        flowChartObject!.elements.forEach((node) => {
          if (!("source" in node)) {
            // Object is a node, not an edge
            const label =
              "Visualize node: " +
              node.data!.label +
              " (#" +
              node.id.slice(-5) +
              ")";
            setSelectOptions((prev) => [
              ...prev,
              { label: label, value: node.id },
            ]);
          }
        });
      }
    }
    return () => {
      setSelectOptions([]);
    };
  }, [ctrlObj, flowChartObject?.elements, ctrlObj?.type]);

  // Filter attached node result from all node results
  useEffect(() => {
    try {
      // figure out what we're visualizing
      const nodeIdToPlot = ctrlObj?.param;
      if (nodeIdToPlot) {
        if (results && "io" in results) {
          const runResults = results.io!.reverse();
          const filteredResult = runResults.filter(
            (node) => nodeIdToPlot === node.id
          )[0];
          setNd(filteredResult === undefined ? null : filteredResult);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [ctrlObj.param, results.io, selectedOption]);

};

export default useControlComponentEffects;