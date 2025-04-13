import { ExtensionsPanel } from "@/components/extensions/ExtensionsPanel";
import AppLayout from "@/layout/app-layout";

export function ExtensionsPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="border-b py-4 px-6">
          <h1 className="text-2xl font-bold">Extensions</h1>
          <p className="text-muted-foreground">
            Discover, install, and manage platform extensions
          </p>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ExtensionsPanel />
        </div>
      </div>
    </AppLayout>
  );
}