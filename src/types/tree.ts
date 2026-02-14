export interface TreeNode {
  id: string;
  tagName: string;
  className: string | null;
  elementId: string | null;
  children: TreeNode[];
  isExpanded?: boolean;
}
