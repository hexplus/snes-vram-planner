import { div } from "sibujs";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Toaster,
  BoxIcon, LayersIcon, InfoIcon, CpuIcon, PaletteIcon,
} from "sibujs-ui";
import { Toolbar }    from "./components/Toolbar";
import { VramGrid }   from "./components/VramGrid";
import { StatsBar }   from "./components/StatsBar";
import { BlockEditor } from "./components/BlockEditor";
import { ModeInfo }   from "./components/ModeInfo";
import { ObselPanel } from "./components/ObselPanel";
import { SceneBar }   from "./components/SceneBar";
import { RegisterPanel } from "./components/RegisterPanel";
import { CgramPanel }    from "./components/CgramPanel";
import { AlignmentWarningDialog } from "./components/AlignmentWarningDialog";

export function App() {
  return div({
    class: "flex flex-col h-screen overflow-hidden bg-background text-foreground",
    nodes: [
      Toolbar(),
      SceneBar(),

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
            nodes: Tabs({
              defaultValue: "block",
              class: "flex flex-col h-full overflow-hidden border-l",
              nodes: [
                TabsList({
                  variant: "line",
                  class: "w-full justify-start px-2 shrink-0",
                  nodes: [
                    TabsTrigger({ value: "block", nodes: [BoxIcon({ class: "size-3.5 mr-1" }), "Block"] }),
                    TabsTrigger({ value: "mode", nodes: [LayersIcon({ class: "size-3.5 mr-1" }), "Mode"] }),
                    TabsTrigger({ value: "obsel", nodes: [InfoIcon({ class: "size-3.5 mr-1" }), "OBSEL"] }),
                    TabsTrigger({ value: "registers", nodes: [CpuIcon({ class: "size-3.5 mr-1" }), "Regs"] }),
                    TabsTrigger({ value: "cgram", nodes: [PaletteIcon({ class: "size-3.5 mr-1" }), "CGRAM"] }),
                  ],
                }),
                TabsContent({
                  value: "block",
                  class: "flex-1 overflow-y-auto p-3 mt-0",
                  nodes: BlockEditor(),
                }),
                TabsContent({
                  value: "mode",
                  class: "flex-1 overflow-y-auto mt-0",
                  nodes: ModeInfo(),
                }),
                TabsContent({
                  value: "obsel",
                  class: "flex-1 overflow-y-auto mt-0",
                  nodes: ObselPanel(),
                }),
                TabsContent({
                  value: "registers",
                  class: "flex-1 overflow-y-auto mt-0",
                  nodes: RegisterPanel(),
                }),
                TabsContent({
                  value: "cgram",
                  class: "flex-1 overflow-y-auto mt-0",
                  nodes: CgramPanel(),
                }),
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
