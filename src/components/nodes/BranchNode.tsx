import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { GitBranch, GitMerge } from 'lucide-react';

export interface BranchNodeData {
    label: string;
    isMain?: boolean;
    raw?: any;
    [key: string]: unknown;
}

export type BranchNode = Node<BranchNodeData, 'branch'>;

const BranchNode = ({ data }: NodeProps<BranchNode>) => {
    return (
        <div className={`px-4 py-2 shadow-lg rounded-md bg-secondary border-2 ${data.isMain ? 'border-primary' : 'border-gray-700'} min-w-[150px]`}>
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-primary"
            />
            <div className="flex items-center gap-2">
                <div className={`p-1 rounded-full ${data.isMain ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-400'}`}>
                    {data.isMain ? <GitMerge size={16} /> : <GitBranch size={16} />}
                </div>
                <div className="flex-1 text-left">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Acción</div>
                    <div className="text-sm font-medium text-foreground">{data.label}</div>


                    {data.raw?.action_description && (
                        <div className="mt-2 p-2 rounded bg-black/10 border border-white/5 text-xs text-gray-400 italic">
                            {data.raw.action_description}
                        </div>
                    )}
                    {data.raw?.stage_id && (
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                            {data.raw.stage_id[1]}
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
