export interface TreeNode {
  id: string;
  tagName: string;
  className: string | null;
  elementId: string | null;
  children: TreeNode[];
  imgSrc: string | null;
  isExpanded?: boolean;
}
