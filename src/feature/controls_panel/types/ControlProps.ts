import { ResultsType } from "@src/feature/results_panel/types/ResultsType";

export interface ControlProps {
  theme: any;
  isEditMode: any;
  results: ResultsType;
  updateCtrlValue: any;
  attachParamsToCtrl: any;
  removeCtrl: any;
  setCurrentInput: any;
  setOpenEditModal: any;
}