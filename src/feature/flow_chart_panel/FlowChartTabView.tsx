import { projectAtom, useFlowChartState } from "@hooks/useFlowChartState";
import { useFlowChartGraph } from "@src/hooks/useFlowChartGraph";
import { useSocket } from "@src/hooks/useSocket";
import {
  RootNode,
  validateRootSchema,
  TreeNode,
} from "@src/utils/ManifestLoader";
import { SmartBezierEdge } from "@tisoap/react-flow-smart-edge";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConnectionLineType,
  EdgeTypes,
  MiniMap,
  NodeDragHandler,
  OnConnect,
  OnEdgesChange,
  OnInit,
  OnNodesChange,
  OnNodesDelete,
  ReactFlow,
  ReactFlowProvider,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import Sidebar, { LeafClickHandler } from "../common/Sidebar/Sidebar";
import FlowChartKeyboardShortcuts from "./FlowChartKeyboardShortcuts";
import { useFlowChartTabState } from "./FlowChartTabState";
import { useAddNewNode } from "./hooks/useAddNewNode";
import { NodeExpandMenu } from "./views/NodeExpandMenu";
import { sendEventToMix } from "@src/services/MixpanelServices";
import { ACTIONS_HEIGHT, LAYOUT_TOP_HEIGHT, Layout } from "../common/Layout";
import { getEdgeTypes, isCompatibleType } from "@src/utils/TypeCheck";
import { CenterObserver } from "./components/CenterObserver";
import useNodeTypes from "./hooks/useNodeTypes";
import { Separator } from "@src/components/ui/separator";
import { Pencil, Text, Workflow, X } from "lucide-react";
import { GalleryModal } from "@src/components/gallery/GalleryModal";
import { toast, Toaster } from "sonner";
import { useTheme } from "@src/providers/themeProvider";
import { ClearCanvasBtn } from "./components/ClearCanvasBtn";
import { Button } from "@src/components/ui/button";
import { ResizeFitter } from "./components/ResizeFitter";
import NodeEditModal from "./components/node-edit-menu/NodeEditModal";
import { useAtom } from "jotai";
import { useHasUnsavedChanges } from "@src/hooks/useHasUnsavedChanges";
import { useAddTextNode } from "./hooks/useAddTextNode";
import { WelcomeModal } from "./views/WelcomeModal";
import { CommandMenu } from "../command/CommandMenu";
import { baseClient } from "@src/lib/base-client";
import { NodesMetadataMap } from "@src/types/nodes-metadata";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ZodError } from "zod";
import useClearCanvas from "./hooks/useClearCanvas";

const FlowChartTab = () => {
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [project, setProject] = useAtom(projectAtom);
  const { setHasUnsavedChanges } = useHasUnsavedChanges();
  const [nodeSection, setNodeSection] = useState<RootNode | null>(null);
  const [mcNodeSection, setMcNodeSection] = useState<RootNode | null>(null);
  const [nodesMetadataMap, setNodesMetadataMap] =
    useState<NodesMetadataMap | null>(null);
  const [nodesMetadataMapMC, setNodesMetadataMapMC] =
    useState<NodesMetadataMap | null>(null);
  const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);

  const { theme, resolvedTheme } = useTheme();

  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isEditMode,
    setIsEditMode,
    isMicrocontrollerMode,
  } = useFlowChartState();

  const { states } = useSocket();
  const { programResults } = states;
  const clearCanvas = useClearCanvas();

  const { pythonString, setPythonString, nodeFilePath, setNodeFilePath } =
    useFlowChartTabState();

  const {
    nodes,
    setNodes,
    textNodes,
    setTextNodes,
    edges,
    setEdges,
    selectedNode,
    unSelectedNodes,
  } = useFlowChartGraph();

  const getNodeFuncCount = useCallback(
    (func: string) => {
      return nodes.filter((n) => n.data.func === func).length;
    },
    // including nodes variable in dependency list would cause excessive re-renders
    // as nodes variable is updated so frequently
    // using nodes.length is more efficient for this case
    // adding eslint-disable-next-line react-hooks/exhaustive-deps to suppress eslint warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.length],
  );

  const addNewNode = useAddNewNode(
    setNodes,
    getNodeFuncCount,
    (isMicrocontrollerMode) ? nodesMetadataMapMC : nodesMetadataMap,
  );
  const addTextNode = useAddTextNode();

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [setIsSidebarOpen],
  );

  const handleNodeRemove = useCallback(
    (nodeId: string, nodeLabel: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      sendEventToMix("Node Deleted", nodeLabel, "nodeTitle");
      setHasUnsavedChanges(true);
    },
    [setNodes, setEdges, setHasUnsavedChanges],
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({ default: SmartBezierEdge }),
    [],
  );

  const nodeTypes = useNodeTypes({
    handleRemove: handleNodeRemove,
    wrapperOnClick: () => {
      setIsEditMode(true);
    },
  });

  const onInit: OnInit = (rfIns) => {
    rfIns.fitView({
      padding: 0.8,
    });
    setProject({ ...project, rfInstance: rfIns.toObject() });
  };
  const handleNodeDrag: NodeDragHandler = (_, node) => {
    setNodes((nodes) => {
      const nodeIndex = nodes.findIndex((el) => el.id === node.id);
      nodes[nodeIndex] = node;
      setHasUnsavedChanges(true);
    });
  };
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((ns) => applyNodeChanges(changes, ns));
      setTextNodes((ns) => applyNodeChanges(changes, ns));
    },
    [setNodes, setTextNodes],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      sendEventToMix("Edges Changed", "");
      setEdges((es) => applyEdgeChanges(changes, es));
      if (!changes.every((c) => c.type === "select")) {
        setHasUnsavedChanges(true);
      }
    },
    [setEdges, setHasUnsavedChanges],
  );
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((eds) => {
        if (nodeSection) {
          const [sourceType, targetType] = getEdgeTypes(
            nodeSection,
            connection,
          );
          if (isCompatibleType(sourceType, targetType)) {
            return addEdge(connection, eds);
          }

          toast.message("Type error", {
            description: `Source type ${sourceType} and target type ${targetType} are not compatible`,
          });
        }
      }),
    [setEdges, nodeSection],
  );

  const onConnectMC: OnConnect = useCallback(
    (connection) =>
      setEdges((eds) => {
        if (mcNodeSection) {
          const [sourceType, targetType] = getEdgeTypes(
            mcNodeSection,
            connection,
          );
          if (isCompatibleType(sourceType, targetType)) {
            return addEdge(connection, eds);
          }

          toast.message("Type error", {
            description: `Source type ${sourceType} and target type ${targetType} are not compatible`,
          });
        }
      }),
    [setEdges, mcNodeSection],
  );

  const handleNodesDelete: OnNodesDelete = useCallback(
    (nodes) => {
      nodes.forEach((node) => {
        sendEventToMix("Node Deleted", node.data.label, "nodeTitle");
      });
      const selectedNodeIds = nodes.map((node) => node.id);
      setNodes((prev) =>
        prev.filter((node) => !selectedNodeIds.includes(node.id)),
      );
      setHasUnsavedChanges(true);
    },
    [setNodes, setHasUnsavedChanges],
  );

  const fetchManifest = useCallback(async () => {
    try {
      /* MANIFEST FOR REGULAR NODES */
      const res = await baseClient.get("nodes/manifest");
      console.log("Nodes manifest fetched", res.data);
      // TODO: fix zod schema to accept io directory structure
      const validateResult = validateRootSchema(res.data);
      if (!validateResult.success) {
        toast.message(`Failed to validate nodes manifest!`, {
          duration: 20000,
          description: "Check browser console for more info.",
        });
        console.error(validateResult.error);
      }
      setNodeSection(res.data);

      /* MANIFEST FOR MC NODES */
      const mcRes = await baseClient.get("nodes-mc/manifest");
      console.log("MC nodes manifest fetched", mcRes.data);
      const validateMcResult = validateRootSchema(mcRes.data);
      if (!validateMcResult.success) {
        toast.message(`Failed to validate MC nodes manifest!`, {
          duration: 20000,
          description: "Check browser console for more info.",
        });
        console.error(validateMcResult.error);
      }
      setMcNodeSection(mcRes.data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errTitle =
        err instanceof ZodError
          ? "Zod validation error"
          : "Failed to generate nodes manifest!";

      const errDescription =
        err instanceof ZodError
          ? `${err.message}`
          : `${err.response?.data?.error}` ?? `${err}`;

      toast.message(errTitle, {
        description: errDescription,
        duration: 60000,
      });
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const res = await baseClient.get("nodes/metadata");
      setNodesMetadataMap(res.data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.message("Failed to generate nodes metadata", {
        description: err.response?.data?.error,
      });
    }
  }, []);

  useEffect(() => {
    fetchManifest();
    fetchMetadata();
  }, [fetchManifest, fetchMetadata]);

  const fetchMetadataMC = useCallback(async () => {
    try {
      const res = await baseClient.get("nodes-mc/metadata");
      setNodesMetadataMapMC(res.data);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.message("Failed to generate nodes metadata", {
        description: err.response?.data?.error,
      });
    }
  }, []);

  useEffect(() => {
    fetchManifest();
    fetchMetadataMC();
  }, [fetchManifest, fetchMetadataMC]);

  useEffect(() => {
    const activeMetadata = (isMicrocontrollerMode) ? nodesMetadataMapMC : nodesMetadataMap;
    if (selectedNode === null || !activeMetadata) {
      return;
    }
    const nodeFileName = `${selectedNode?.data.func}.py`;
    const nodeFileData = activeMetadata[nodeFileName] ?? {};
    setNodeFilePath(nodeFileData.path ?? "");
    setPythonString(nodeFileData.metadata ?? "");
  }, [selectedNode, setNodeFilePath, setPythonString, nodesMetadataMap, nodesMetadataMapMC, isMicrocontrollerMode]);

  const deleteKeyCodes = ["Delete", "Backspace"];

  const proOptions = { hideAttribution: true };

  const nodeToEdit =
    nodes.filter((n) => n.selected).length > 1 ? null : selectedNode;

  const onCommandMenuItemSelect = (node: TreeNode) => {
    addNewNode(node);
    setCommandMenuOpen(false);
  };

  return (
    <Layout>
      <ReactFlowProvider>
        <div className="mx-8" style={{ height: ACTIONS_HEIGHT }}>
          <div className="py-1" />
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="add-node-button"
                    className="gap-2"
                    variant="ghost"
                    onClick={toggleSidebar}
                  >
                    <Workflow size={20} className="stroke-muted-foreground" />
                    Add Node
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Try Ctrl/Cmd + K</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              data-testid="add-text-button"
              className="gap-2"
              variant="ghost"
              onClick={addTextNode}
            >
              <Text size={20} className="stroke-muted-foreground" />
              Add Text
            </Button>

            <GalleryModal
              isGalleryOpen={isGalleryOpen}
              setIsGalleryOpen={setIsGalleryOpen}
            />
            <div className="grow" />
            {selectedNode && (
              <>
                {!isEditMode ? (
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => setIsEditMode(true)}
                    data-testid="toggle-edit-mode"
                  >
                    <Pencil size={18} className="stroke-muted-foreground" />
                    Edit Node
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => setIsEditMode(false)}
                  >
                    <X size={18} className="stroke-muted-foreground" />
                    Cancel Edit
                  </Button>
                )}
              </>
            )}
            <ClearCanvasBtn clearCanvas={clearCanvas} />
          </div>
          <div className="py-1" />
          <Separator />
        </div>

        {!isMicrocontrollerMode && nodeSection && (
          <Sidebar
            sections={nodeSection}
            leafNodeClickHandler={addNewNode as LeafClickHandler}
            isSideBarOpen={isSidebarOpen}
            setSideBarStatus={setIsSidebarOpen}
          />
        )}

        {isMicrocontrollerMode && mcNodeSection && (
          <Sidebar
            sections={mcNodeSection}
            leafNodeClickHandler={addNewNode as LeafClickHandler}
            isSideBarOpen={isSidebarOpen}
            setSideBarStatus={setIsSidebarOpen}
          />
        )}

        <Toaster theme={theme} />

        <WelcomeModal />

        <div
          style={{ height: `calc(100vh - ${LAYOUT_TOP_HEIGHT}px)` }}
          className="relative overflow-hidden"
          data-testid="react-flow"
          id="flow-chart-area"
        >
          {nodeToEdit && isEditMode && (
            <NodeEditModal
              node={nodeToEdit}
              otherNodes={unSelectedNodes}
              setNodeModalOpen={setNodeModalOpen}
              handleDelete={handleNodeRemove}
            />
          )}

          <FlowChartKeyboardShortcuts />
          <ResizeFitter />
          <CenterObserver />

          <ReactFlow
            id="flow-chart"
            className="!fixed"
            deleteKeyCode={deleteKeyCodes}
            proOptions={proOptions}
            nodes={[...nodes, ...textNodes]}
            nodeTypes={nodeTypes}
            edges={edges}
            edgeTypes={edgeTypes}
            connectionLineType={ConnectionLineType.Step}
            onInit={onInit}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isMicrocontrollerMode ? onConnectMC : onConnect}
            onNodeDragStop={handleNodeDrag}
            onNodesDelete={handleNodesDelete}
            fitViewOptions={{
              padding: 0.8,
            }}
          >
            <MiniMap
              className="!bottom-40 !bg-background"
              nodeColor={
                resolvedTheme === "light"
                  ? "rgba(0, 0, 0, 0.25)"
                  : "rgba(255, 255, 255, 0.25)"
              }
              maskColor={
                resolvedTheme === "light"
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)"
              }
              zoomable
              pannable
            />
            <Controls
              fitViewOptions={{ padding: 0.8 }}
              className="!bottom-40 !shadow-control"
            />
          </ReactFlow>

          <NodeExpandMenu
            selectedNode={selectedNode}
            modalIsOpen={nodeModalOpen}
            setModalOpen={setNodeModalOpen}
            nodeResults={programResults}
            pythonString={pythonString}
            nodeFilePath={nodeFilePath}
          />
        </div>
      </ReactFlowProvider>
      <CommandMenu
        manifestRoot={nodeSection as TreeNode}
        open={isCommandMenuOpen}
        placeholder="Search for a node..."
        setOpen={setCommandMenuOpen}
        onItemSelect={onCommandMenuItemSelect}
      />
    </Layout>
  );
};

export default FlowChartTab;
