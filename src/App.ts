import { div } from "sibujs";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
  Toaster,
} from "sibujs-ui";
import { Toolbar }    from "./components/Toolbar";
import { VramGrid }   from "./components/VramGrid";
import { StatsBar }   from "./components/StatsBar";
import { BlockEditor } from "./components/BlockEditor";
import { ModeInfo }   from "./components/ModeInfo";
import { AlignmentWarningDialog } from "./components/AlignmentWarningDialog";

export function App() {
  return div({
    class: "flex flex-col h-screen overflow-hidden bg-background text-foreground",
    nodes: [
      Toolbar(),

      ResizablePanelGroup({
        direction: "horizontal",
        class: "flex-1 overflow-hidden",
        nodes: [
          ResizablePanel({
            defaultSize: 75,
            minSize: 50,
            nodes: div({
              class: "flex flex-col h-full overflow-hidden",
              nodes: [
                div({ class: "flex-1 overflow-auto", nodes: VramGrid() }),
                StatsBar(),
              ],
            }),
          }),

          ResizableHandle({ withHandle: true }),

          ResizablePanel({
            defaultSize: 25,
            minSize: 20,
            nodes: div({
              class: "flex flex-col h-full overflow-hidden border-l",
              nodes: [
                ModeInfo(),
                div({ class: "flex-1 overflow-y-auto p-3", nodes: BlockEditor() }),
              ],
            }),
          }),
        ],
      }),

      Toaster({ position: "bottom-right", richColors: true }),
      AlignmentWarningDialog(),
    ],
  });
}
