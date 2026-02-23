import { useCallback, useEffect, useState, useRef } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
    Panel,
    ReactFlowProvider,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BranchNode from './nodes/BranchNode';
import { Product, getWorkflowLines, SuggestedAction, createWorkflowLine, addWorkflowConnection, getOrderStates, updateWorkflowLine, OrderState, removeWorkflowConnection, deleteWorkflowLine } from '../services/api';
import { Package, RefreshCw, Plus, X, Settings2, Save, CheckCircle2, Zap, AlertCircle, Trash2 } from 'lucide-react';
import { Edge, Node } from '@xyflow/react';

interface BranchEditorProps {
    selectedProduct: Product;
}

const nodeTypes = {
    branch: BranchNode,
};

type BranchNodeObject = {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; isMain: boolean };
};

const BranchEditor = ({ selectedProduct }: BranchEditorProps) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<BranchNodeObject>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(false);
    const [orderStates, setOrderStates] = useState<OrderState[]>([]);
    const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
    const [edgeContextMenu, setEdgeContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);
    const [nodeContextMenu, setNodeContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);
    const [newBranchData, setNewBranchData] = useState<Partial<SuggestedAction>>({
        name: '',
        action_description: '',
        state: 'draft',
        priority: 'low',
        is_automatic: false,
        completes_order_line: false,
        require_evidence: false,
        stage_id: false
    });

    const connectingNodeId = useRef<string | null>(null);
    const connectingToNode = useRef<boolean>(false);

    const fetchLines = useCallback(async () => {
        setLoading(true);
        try {
            const lines = await getWorkflowLines(selectedProduct.id);

            // Create nodes
            const newNodes: BranchNodeObject[] = lines.map((line: SuggestedAction, index: number) => ({
                id: line.id.toString(),
                type: 'branch',
                position: { x: 100 + (index % 3) * 350, y: 100 + Math.floor(index / 3) * 200 },
                data: {
                    label: line.name,
                    isMain: index === 0,
                    raw: line // Store full object for editing
                },
            }));

            // Create edges from related_line_ids
            const newEdges: Edge[] = [];
            lines.forEach((line: SuggestedAction) => {
                if (line.related_line_ids && Array.isArray(line.related_line_ids)) {
                    line.related_line_ids.forEach((targetId: number) => {
                        newEdges.push({
                            id: `e${line.id}-${targetId}`,
                            source: line.id.toString(),
                            target: targetId.toString(),
                            animated: true,
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: '#4b5563',
                            },
                        });
                    });
                }
            });

            setNodes(newNodes);
            setEdges(newEdges);
        } catch (err) {
            console.error('Fetch workflow lines failed:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedProduct.id, setNodes, setEdges]);

    const onConnect = useCallback(
        async (params: Connection) => {
            if (params.source && params.target) {
                connectingToNode.current = true;
                const success = await addWorkflowConnection(
                    parseInt(params.source),
                    parseInt(params.target)
                );
                if (success) {
                    setEdges((eds) => addEdge({
                        ...params,
                        animated: true,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: '#4b5563',
                        }
                    }, eds));
                } else {
                    alert("Error al guardar la conexión en el servidor");
                }
            }
        },
        [setEdges]
    );

    const onConnectStart = useCallback((_: any, { nodeId }: any) => {
        connectingNodeId.current = nodeId;
        connectingToNode.current = false;
    }, []);

    const onConnectEnd = useCallback(
        async (event: MouseEvent | TouchEvent) => {
            if (!connectingNodeId.current || connectingToNode.current) {
                connectingNodeId.current = null;
                connectingToNode.current = false;
                return;
            }

            const target = event.target as HTMLElement;
            const isPane = target.classList.contains('react-flow__pane');

            if (isPane) {
                // Instead of prompt, open creation form
                const sourceId = connectingNodeId.current;
                setPendingSourceId(sourceId);
                setNewBranchData({
                    name: '',
                    action_description: '',
                    state: 'draft',
                    priority: 'low',
                    is_automatic: false,
                    completes_order_line: false,
                    require_evidence: false,
                    stage_id: false
                });
                setIsCreating(true);
                setSelectedAction(null);
            }

            connectingNodeId.current = null;
        },
        [selectedProduct.id]
    );

    useEffect(() => {
        const loadInitialData = async () => {
            if (selectedProduct) {
                await fetchLines();
                const states = await getOrderStates();
                setOrderStates(states);
            }
        };
        loadInitialData();
    }, [selectedProduct, fetchLines]);

    const onNodesDelete = useCallback(
        async (deletedNodes: Node[]) => {
            for (const node of deletedNodes) {
                if (node.id) {
                    await deleteWorkflowLine(parseInt(node.id));
                    setSelectedAction(prev => prev && prev.id.toString() === node.id ? null : prev);
                }
            }
        },
        []
    );

    const onEdgesDelete = useCallback(
        async (deletedEdges: Edge[]) => {
            for (const edge of deletedEdges) {
                if (edge.source && edge.target) {
                    await removeWorkflowConnection(parseInt(edge.source), parseInt(edge.target));
                }
            }
        },
        []
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();
            setEdgeContextMenu({
                id: edge.id,
                x: event.clientX,
                y: event.clientY,
            });
            setNodeContextMenu(null);
        },
        []
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            setNodeContextMenu({
                id: node.id,
                x: event.clientX,
                y: event.clientY,
            });
            setEdgeContextMenu(null);
        },
        []
    );

    const handleSuppressEdge = async () => {
        if (!edgeContextMenu) return;
        const edge = edges.find(e => e.id === edgeContextMenu.id);
        if (edge && edge.source && edge.target) {
            setLoading(true);
            const success = await removeWorkflowConnection(parseInt(edge.source), parseInt(edge.target));
            if (success) {
                await fetchLines();
            } else {
                alert("Error al eliminar la conexión");
            }
            setLoading(false);
        }
        setEdgeContextMenu(null);
    };

    const handleDeleteNodeContext = async () => {
        if (!nodeContextMenu) return;
        const nodeId = nodeContextMenu.id;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            if (!confirm(`¿Estás seguro de que quieres eliminar "${node.data.label}"?`)) {
                setNodeContextMenu(null);
                return;
            }

            setLoading(true);
            const success = await deleteWorkflowLine(parseInt(nodeId));
            if (success) {
                await fetchLines();
                if (selectedAction?.id.toString() === nodeId) {
                    setSelectedAction(null);
                }
            } else {
                alert("Error al eliminar la acción");
            }
            setLoading(false);
        }
        setNodeContextMenu(null);
    };

    const handleUpdateAction = async (updatedData: Partial<SuggestedAction>) => {
        if (!selectedAction) return;
        setLoading(true);
        const success = await updateWorkflowLine(selectedAction.id, updatedData);
        if (success) {
            await fetchLines();
            // Refresh selection
            setSelectedAction(prev => prev ? { ...prev, ...updatedData } : null);
        } else {
            alert("Error al actualizar la acción");
        }
        setLoading(false);
    };

    const handleDeleteAction = async () => {
        if (!selectedAction) return;
        if (!confirm(`¿Estás seguro de que quieres eliminar "${selectedAction.name}"?`)) return;

        setLoading(true);
        const success = await deleteWorkflowLine(selectedAction.id);
        if (success) {
            await fetchLines();
            setSelectedAction(null);
        } else {
            alert("Error al eliminar la acción");
        }
        setLoading(false);
    };

    const handleCreateAction = async () => {
        if (!newBranchData.name?.trim()) return alert("El nombre es requerido");

        setLoading(true);
        try {
            const newId = await createWorkflowLine(selectedProduct.id, newBranchData.name.trim(), newBranchData);
            if (newId) {
                if (pendingSourceId) {
                    await addWorkflowConnection(parseInt(pendingSourceId), newId);
                }
                await fetchLines();
                setIsCreating(false);
                setPendingSourceId(null);
            } else {
                alert("Error al crear la acción");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddBranch = () => {
        setPendingSourceId(null);
        setNewBranchData({
            name: '',
            action_description: '',
            state: 'draft',
            priority: 'low',
            is_automatic: false,
            completes_order_line: false,
            require_evidence: false,
            stage_id: false
        });
        setIsCreating(true);
        setSelectedAction(null);
    };

    return (
        <div className="w-full h-full bg-background relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onEdgeContextMenu={onEdgeContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onPaneClick={() => {
                    setEdgeContextMenu(null);
                    setNodeContextMenu(null);
                }}
                onNodeClick={(_event, node) => {
                    setSelectedAction((node.data as any).raw);
                    setIsCreating(false);
                    setEdgeContextMenu(null);
                    setNodeContextMenu(null);
                }}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#333" />

                {/* Edge Context Menu */}
                {edgeContextMenu && (
                    <div
                        className="fixed z-50 bg-secondary/90 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-100 flex overflow-hidden"
                        style={{ top: edgeContextMenu.y, left: edgeContextMenu.x }}
                    >
                        <button
                            onClick={handleSuppressEdge}
                            className="p-3 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
                            title="Eliminar Conexión"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                )}

                {/* Node Context Menu */}
                {nodeContextMenu && (
                    <div
                        className="fixed z-50 bg-secondary/90 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-100 flex overflow-hidden"
                        style={{ top: nodeContextMenu.y, left: nodeContextMenu.x }}
                    >
                        <button
                            onClick={handleDeleteNodeContext}
                            className="p-3 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
                            title="Eliminar Acción"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                )}
                <Controls className="z-50 bg-secondary! border-gray-800! rounded-lg! shadow-xl! m-6!" />
                <MiniMap
                    nodeColor={(node) => {
                        return node.data?.isMain ? '#3b82f6' : '#1f2937';
                    }}
                    maskColor="rgba(0, 0, 0, 0.4)"
                    className="z-40 bg-secondary! border-gray-800! rounded-xl! shadow-xl! m-6!"
                />

                {/* Product Info Panel */}
                <Panel position="top-right" className="z-50 bg-secondary/70 backdrop-blur-md p-4 rounded-xl border border-gray-800 m-6 shadow-2xl flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30 group-hover:bg-primary/30 transition-colors">
                        {loading ? <RefreshCw size={20} className="animate-spin" /> : <Package size={20} />}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Producto Activo</div>
                        <div className="text-lg font-bold text-foreground">
                            {selectedProduct.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {selectedProduct.id}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleAddBranch}
                            disabled={loading || isCreating}
                            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <Plus size={14} />
                            Añadir Acción
                        </button>
                    </div>
                </Panel>

                {/* Details / Creation Panel */}
                {(selectedAction || isCreating) && (
                    <Panel position="bottom-right" className="z-50 w-96 bg-secondary/80 backdrop-blur-xl border border-gray-800 m-6 rounded-2xl shadow-3xl overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    {isCreating ? <Plus size={18} /> : <Settings2 size={18} />}
                                </div>
                                <h3 className="font-bold text-foreground">
                                    {isCreating ? 'Crear Nueva Acción' : 'Detalles de la Acción'}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedAction(null);
                                    setIsCreating(false);
                                }}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {/* Name & Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nombre a Mostrar</label>
                                    <input
                                        type="text"
                                        value={isCreating ? newBranchData.name : selectedAction?.name}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, name: e.target.value }))
                                            : setSelectedAction(prev => prev ? { ...prev, name: e.target.value } : null)
                                        }
                                        onBlur={(e) => {
                                            if (!isCreating && selectedAction) {
                                                handleUpdateAction({ name: e.target.value });
                                            }
                                        }}
                                        className="w-full bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder="Nombre de la Nueva Acción"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Descripción de la Acción</label>
                                    <textarea
                                        value={isCreating ? newBranchData.action_description : (selectedAction?.action_description || '')}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, action_description: e.target.value }))
                                            : setSelectedAction(prev => prev ? { ...prev, action_description: e.target.value } : null)
                                        }
                                        onBlur={(e) => {
                                            if (!isCreating && selectedAction) {
                                                handleUpdateAction({ action_description: e.target.value });
                                            }
                                        }}
                                        className="w-full bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none transition-all h-24 resize-none"
                                        placeholder="Explica qué sucede en esta acción..."
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-800" />

                            {/* State & Stage */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Estado Interno</label>
                                    <select
                                        value={isCreating ? newBranchData.state : (selectedAction?.state || 'draft')}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, state: e.target.value as any }))
                                            : handleUpdateAction({ state: e.target.value as any })
                                        }
                                        className="w-full bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="done">Hecho</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Etapa de la Orden</label>
                                    <select
                                        value={isCreating
                                            ? (newBranchData.stage_id as any || '')
                                            : (Array.isArray(selectedAction?.stage_id) ? selectedAction?.stage_id[0] : (selectedAction?.stage_id as any || ''))
                                        }
                                        onChange={(e) => {
                                            const val = e.target.value ? parseInt(e.target.value) : false;
                                            isCreating
                                                ? setNewBranchData(prev => ({ ...prev, stage_id: val }))
                                                : handleUpdateAction({ stage_id: val });
                                        }}
                                        className="w-full bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                    >
                                        <option value="">Seleccionar Etapa</option>
                                        {orderStates.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Configuration Flags */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Configuraciones de Ejecución</label>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-gray-800/50">
                                    <div className="flex items-center gap-3">
                                        <Zap size={16} className="text-yellow-500/70" />
                                        <span className="text-sm font-medium">Tarea inicial</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isCreating ? newBranchData.is_automatic : selectedAction?.is_automatic}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, is_automatic: e.target.checked }))
                                            : handleUpdateAction({ is_automatic: e.target.checked })
                                        }
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-primary focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-gray-800/50">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-emerald-500/70" />
                                        <span className="text-sm font-medium">Completa la línea de orden</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isCreating ? newBranchData.completes_order_line : selectedAction?.completes_order_line}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, completes_order_line: e.target.checked }))
                                            : handleUpdateAction({ completes_order_line: e.target.checked })
                                        }
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-primary focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-gray-800/50">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={16} className="text-orange-500/70" />
                                        <span className="text-sm font-medium">Requiere evidencia</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isCreating ? newBranchData.require_evidence : selectedAction?.require_evidence}
                                        onChange={(e) => isCreating
                                            ? setNewBranchData(prev => ({ ...prev, require_evidence: e.target.checked }))
                                            : handleUpdateAction({ require_evidence: e.target.checked })
                                        }
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-primary focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                                    Prioridad ({isCreating ? newBranchData.priority : (selectedAction?.priority || 'low')})
                                </label>
                                <select
                                    value={isCreating ? (newBranchData.priority as string) : (selectedAction?.priority as string || 'low')}
                                    onChange={(e) => {
                                        const p = e.target.value;
                                        isCreating
                                            ? setNewBranchData(prev => ({ ...prev, priority: p }))
                                            : handleUpdateAction({ priority: p });
                                    }}
                                    className="w-full bg-black/40 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>

                            {isCreating && (
                                <button
                                    onClick={handleCreateAction}
                                    disabled={loading || !newBranchData.name}
                                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                    Crear Acción
                                </button>
                            )}

                            {!isCreating && (
                                <button
                                    onClick={handleDeleteAction}
                                    disabled={loading}
                                    className="w-full mt-8 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    <Trash2 size={18} />
                                    Eliminar Acción
                                </button>
                            )}
                        </div>

                        {loading && !isCreating && (
                            <div className="absolute inset-0 bg-secondary/20 backdrop-blur-[2px] flex items-center justify-center">
                                <RefreshCw className="animate-spin text-primary" size={32} />
                            </div>
                        )}
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};

const BranchEditorWithProvider = (props: BranchEditorProps) => (
    <ReactFlowProvider>
        <BranchEditor {...props} />
    </ReactFlowProvider>
);

export default BranchEditorWithProvider;
