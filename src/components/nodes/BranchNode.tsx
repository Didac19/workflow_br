import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps, useNodeId, useEdges } from '@xyflow/react';
import { GitBranch, GitMerge } from 'lucide-react';

export interface BranchNodeData {
    label: string;
    isMain?: boolean;
    raw?: any;
    [key: string]: unknown;
}

export type BranchNode = Node<BranchNodeData, 'branch'>;

const BranchNode = ({ data }: NodeProps<BranchNode>) => {
    const nodeId = useNodeId();
    const edges = useEdges();

    // Ensure we have a valid nodeId before calculating connections
    const hasOutgoing = nodeId ? edges.some((e) => String(e.source) === String(nodeId)) : false;
    const hasIncoming = nodeId ? edges.some((e) => String(e.target) === String(nodeId)) : false;

    // A node is the "end" if it has incoming connections but nothing going out
    const isLastConnected = hasIncoming && !hasOutgoing;

    let iconBoxClass = 'bg-gray-700/50 text-gray-400';
    if (data.isMain) {
        iconBoxClass = 'bg-primary/20 text-primary';
    } else if (isLastConnected) {
        iconBoxClass = 'bg-red-500/20 text-red-500';
    }

    return (
        <div className={`px-4 py-2 shadow-lg rounded-md bg-secondary border-2 ${data.isMain ? 'border-primary' : (isLastConnected ? 'border-red-500/30' : 'border-gray-700')} min-w-[150px] transition-colors duration-300`}>
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-primary"
            />
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${iconBoxClass} transition-colors duration-300`}>
                    {data.isMain ? <GitMerge size={16} /> : <GitBranch size={16} />}
                </div>
                <div className="flex-1 text-left">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Acción</div>
                    <div className="text-sm font-bold text-foreground leading-tight">{data.label}</div>


                    {data.raw?.action_description && (
                        <div className="mt-2 p-2 rounded bg-black/20 border border-white/5 text-[11px] text-gray-400 italic line-clamp-2">
                            {data.raw.action_description}
                        </div>
                    )}
                    {data.raw?.stage_id && (
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold">
                            {Array.isArray(data.raw.stage_id) ? data.raw.stage_id[1] : data.raw.stage_id}
                        </div>
                    )}

                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-primary"
            />
        </div>
    );
};

export default memo(BranchNode);
