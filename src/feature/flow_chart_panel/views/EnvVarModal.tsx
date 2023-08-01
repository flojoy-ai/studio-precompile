import FamilyHistoryIconSvg from "@src/assets/FamilyHistoryIconSVG";
import { memo, ChangeEvent, ClipboardEvent, useState } from "react";
import { useFlowChartState } from "@src/hooks/useFlowChartState";
import { postEnvironmentVariable } from "@src/services/FlowChartServices";
import EnvVarCredentialsInfo from "./EnvVarCredentials/EnvVarCredentialsInfo";
import { Button } from "@src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "sonner";
import { ScrollArea } from "@src/components/ui/scroll-area";

interface EnvVarModalProps {
  handleEnvVarModalOpen: (open: boolean) => void;
  isEnvVarModalOpen: boolean;
  fetchCredentials: () => void;
}

const EnvVarModal = ({
  handleEnvVarModalOpen,
  isEnvVarModalOpen,
  fetchCredentials,
}: EnvVarModalProps) => {
  const { credentials } = useFlowChartState();
  const [envVarKey, setEnvVarKey] = useState<string>("");
  const [envVarValue, setEnvVarValue] = useState<string>("");

  const handleEnvVarKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEnvVarKey(e.target.value);
  };

  const handleEnvVarValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEnvVarValue(e.target.value);
  };

  const handlePaste = (
    e: ClipboardEvent<HTMLInputElement>,
    target: "key" | "value"
  ) => {
    e.preventDefault();
    const val = e.clipboardData.getData("text");
    if (val.includes("=")) {
      const parts = val.split("=");
      setEnvVarKey(parts[0]);
      setEnvVarValue(parts[1]);
    } else {
      if (target === "key") {
        setEnvVarKey(val);
      } else {
        setEnvVarValue(val);
      }
    }
  };

  // const handleClose = () => {
  //   setApiKey("");
  //   setApiValue("");
  //   onClose();
  // };

  const handleSendEnvVar = () => {
    postEnvironmentVariable({ key: envVarKey, value: envVarValue });
    setEnvVarKey("");
    setEnvVarValue("");
    fetchCredentials();
  };

  // const isDisabled = !(envVarKey && envVarValue);
  // const buttonClass = `ml-80 inline-flex rounded-md bg-red px-3 py-2 text-sm font-semibold dark:text-gray-900 shadow-sm ${
  //   isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent1-hover"
  // }`;

  // if (!isOpen) return null;
  return (
    <Dialog open={isEnvVarModalOpen} onOpenChange={handleEnvVarModalOpen}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle
            className="ml-2 flex gap-2 text-xl font-semibold text-black dark:text-white"
            id="modal-title"
          >
            <FamilyHistoryIconSvg size={20} />
            <div className="-mt-0.5">Environment Variables</div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 py-1 sm:flex-row">
          <div className="inline-block flex-1">
            <Label
              htmlFor="EnvVarKey"
              className="text-right font-semibold text-black dark:text-white sm:text-sm"
            >
              Key:
            </Label>
            <Input
              id="EnvVarKey"
              type="text"
              placeholder="e.g CLIENT_KEY"
              value={envVarKey || ""}
              className=" mt-1 text-black shadow-sm dark:bg-neutral-800 dark:text-white sm:text-sm"
              onPaste={(e) => handlePaste(e, "key")}
              onChange={handleEnvVarKeyChange}
            />
          </div>
          <div className="inline-block flex-1">
            <Label
              htmlFor="EnvVarValue"
              className="text-right font-semibold text-black dark:text-white sm:text-sm"
            >
              Value:
            </Label>
            <Input
              id="EnvVarValue"
              type="password"
              value={envVarValue || ""}
              className="mt-1 text-black shadow-sm dark:bg-neutral-800 dark:text-white sm:text-sm"
              onPaste={(e) => handlePaste(e, "value")}
              onChange={handleEnvVarValueChange}
            />
          </div>
        </div>
        <DialogFooter className="px-3">
          <Button onClick={handleSendEnvVar}>Add</Button>
        </DialogFooter>
        <hr className="mb-3 mt-1.5 h-3 " />
        <div className="-mt-5 max-h-80 ">
          <ScrollArea className="h-80 w-full rounded-md">
            <div className="pr-3">
              {credentials.length > 0 &&
                credentials.map((credential) => (
                  <EnvVarCredentialsInfo
                    key={credential.id}
                    credential={credential}
                  />
                ))}
            </div>
          </ScrollArea>
        </div>
        <Toaster className="absolute bottom-0 right-0" />
      </DialogContent>
    </Dialog>
  );
};

export default memo(EnvVarModal);