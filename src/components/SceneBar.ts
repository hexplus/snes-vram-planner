import { div, span, signal } from "sibujs";
import {
  Button, Input,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
  PlusIcon, EllipsisIcon, GitCompareIcon,
} from "sibujs-ui";
import { appStore, scenes, activeSceneId, compareSceneId } from "../store";

export function SceneBar() {
  return div({
    class: "flex items-center gap-0 border-b bg-muted/30 px-2 overflow-x-auto",
    nodes: [
      // Scene tabs
      div({
        class: "flex items-center gap-0",
        nodes: () => scenes().map(scene => SceneTab(scene.id, scene.name)),
      }),

      // Add scene button
      Button({
        size: "icon-sm",
        variant: "ghost",
        class: "ml-1 shrink-0",
        nodes: PlusIcon({ class: "size-3.5" }),
        on: { click: () => appStore.dispatch("addScene") },
      }),

      // Compare overlay selector (right side)
      div({
        class: () => scenes().length > 1 ? "ml-auto flex items-center gap-1.5 shrink-0 pr-1" : "hidden",
        nodes: [
          GitCompareIcon({ class: "size-3.5 text-muted-foreground" }),
          span({ class: "text-[10px] text-muted-foreground", nodes: "Compare:" }),
          div({ class: "flex items-center gap-1", nodes: () => {
            const current = compareSceneId();
            const otherScenes = scenes().filter(s => s.id !== activeSceneId());
            return [
              // "Off" button
              Button({
                size: "sm", variant: current === null ? "default" : "ghost",
                class: "h-6 text-[10px] px-2",
                nodes: "Off",
                on: { click: () => appStore.dispatch("setCompareScene", null) },
              }),
              // One button per other scene
              ...otherScenes.map(s =>
                Button({
                  size: "sm", variant: current === s.id ? "default" : "ghost",
                  class: "h-6 text-[10px] px-2",
                  nodes: s.name,
                  on: { click: () => appStore.dispatch("setCompareScene", s.id) },
                })
              ),
            ];
          }}),
        ],
      }),
    ],
  });
}

function SceneTab(sceneId: string, initialName: string) {
  const [renameText, setRenameText] = signal(initialName);

  return div({
    class: () => {
      const isActive = activeSceneId() === sceneId;
      return `flex items-center gap-0.5 px-3 py-1.5 text-xs cursor-pointer border-b-2 select-none shrink-0 ${
        isActive
          ? "border-primary font-medium bg-background"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`;
    },
    on: { click: () => appStore.dispatch("switchScene", sceneId) },
    nodes: [
      span({ nodes: () => {
        const scene = scenes().find(s => s.id === sceneId);
        return scene?.name ?? initialName;
      }}),

      // Context menu (dropdown)
      DropdownMenu({ nodes: [
        DropdownMenuTrigger({
          nodes: div({
            class: "ml-1 p-0.5 rounded hover:bg-muted",
            on: { click: (e: Event) => e.stopPropagation() },
            nodes: EllipsisIcon({ class: "size-3" }),
          }),
        }),
        DropdownMenuContent({ nodes: [
          // Rename
          Dialog({ nodes: [
            DialogTrigger({
              nodes: DropdownMenuItem({
                onSelect: () => {
                  const scene = scenes().find(s => s.id === sceneId);
                  if (scene) setRenameText(scene.name);
                },
                nodes: "Rename",
              }),
            }),
            DialogContent({ nodes: [
              DialogHeader({ nodes: [
                DialogTitle({ nodes: "Rename Scene" }),
                DialogDescription({ nodes: "Enter a new name for this scene." }),
              ]}),
              div({ class: "py-4", nodes:
                Input({
                  value: (() => renameText()) as unknown as string,
                  on: { input: (e: Event) => setRenameText((e.target as HTMLInputElement).value) },
                }),
              }),
              DialogFooter({ nodes: [
                DialogClose({ nodes: Button({ variant: "outline", nodes: "Cancel" }) }),
                DialogClose({ nodes: Button({
                  nodes: "Rename",
                  on: { click: () => appStore.dispatch("renameScene", { id: sceneId, name: renameText() }) },
                })}),
              ]}),
            ]}),
          ]}),

          // Duplicate
          DropdownMenuItem({
            nodes: "Duplicate",
            onSelect: () => appStore.dispatch("duplicateScene", sceneId),
          }),

          DropdownMenuSeparator({}),

          // Delete
          AlertDialog({ nodes: [
            AlertDialogTrigger({
              nodes: DropdownMenuItem({
                class: () => scenes().length <= 1 ? "opacity-50 pointer-events-none" : "text-destructive",
                nodes: "Delete",
              }),
            }),
            AlertDialogContent({ nodes: [
              AlertDialogHeader({ nodes: [
                AlertDialogTitle({ nodes: "Delete scene?" }),
                AlertDialogDescription({ nodes: () => {
                  const scene = scenes().find(s => s.id === sceneId);
                  return `This will permanently delete "${scene?.name ?? "this scene"}" and all its blocks.`;
                }}),
              ]}),
              AlertDialogFooter({ nodes: [
                AlertDialogCancel({ nodes: "Cancel" }),
                AlertDialogAction({
                  variant: "destructive",
                  nodes: "Delete",
                  on: { click: () => appStore.dispatch("removeScene", sceneId) },
                }),
              ]}),
            ]}),
          ]}),
        ]}),
      ]}),
    ],
  });
}
