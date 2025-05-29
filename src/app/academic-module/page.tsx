
import { AcademicModuleCreator } from "@/components/academic-module-creator";

export default function AcademicModulePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-6 bg-background">
      <h1 className="text-3xl font-bold text-primary mb-6 text-center">AI Academic Module Creator</h1>
      <AcademicModuleCreator />
    </main>
  );
}
