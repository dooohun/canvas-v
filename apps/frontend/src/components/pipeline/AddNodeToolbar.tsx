import { Box, ImagePlus, Type } from 'lucide-react';
import type { NodeType } from '@repo/shared-types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AddNodeToolbarProps {
  onAddNode: (type: NodeType) => void;
}

export function AddNodeToolbar({ onAddNode }: AddNodeToolbarProps) {
  return (
    <div className="flex items-center gap-4 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-lg backdrop-blur-md">
      <Button
        variant="ghost"
        className="gap-2 rounded-full text-slate-500"
        onClick={() => onAddNode('textPrompt')}
      >
        <Type className="size-3" />
        Text Node
      </Button>
      <Separator orientation="vertical" className="h-4" />
      <Button
        variant="ghost"
        className="gap-2 rounded-full text-slate-500"
        onClick={() => onAddNode('generateImage')}
      >
        <ImagePlus className="size-3.5" />
        Image Node
      </Button>
      <Separator orientation="vertical" className="h-4" />
      <Button
        variant="ghost"
        className="gap-2 rounded-full text-slate-500"
        onClick={() => onAddNode('generate3d')}
      >
        <Box className="size-3.5" />
        3D Node
      </Button>
    </div>
  );
}
