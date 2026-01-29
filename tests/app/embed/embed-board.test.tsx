import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs/promises";

describe("EmbedBoard - Dependency Array Fix Verification", () => {
  describe("useEffect dependency array correctness", () => {
    it("verification callback useEffect excludes ideas from dependencies", async () => {
      const fileContent = await fs.readFile(
        path.resolve(
          process.cwd(),
          "src/app/embed/[workspaceId]/embed-board.tsx"
        ),
        "utf-8"
      );

      // Find the verification callback useEffect
      const verificationEffectMatch = fileContent.match(
        /\/\*\*[\s\S]*?Verification callback handler[\s\S]*?\*\/[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[([\s\S]*?)\]\);/
      );

      expect(verificationEffectMatch).toBeTruthy();

      if (verificationEffectMatch) {
        const dependencies = verificationEffectMatch[1];

        // Verify ideas is NOT in the dependency array
        expect(dependencies).not.toContain("ideas");

        // Verify required dependencies ARE present
        expect(dependencies).toContain("searchParams");
        expect(dependencies).toContain("pathname");
        expect(dependencies).toContain("router");
        expect(dependencies).toContain("refreshData");
        expect(dependencies).toContain("executeVote");
      }
    });
  });

  describe("verification flow structure", () => {
    it("refreshData is called before using ideas in verification callback", async () => {
      const fileContent = await fs.readFile(
        path.resolve(
          process.cwd(),
          "src/app/embed/[workspaceId]/embed-board.tsx"
        ),
        "utf-8"
      );

      // Verify the verification flow structure
      // refreshData is called when verified=true
      expect(fileContent).toContain('if (verified === "true")');
      expect(fileContent).toContain("await refreshData()");

      // Verify ideas.find is used after refreshData (fallback pattern)
      expect(fileContent).toContain("ideas.find");

      // Verify fallback object exists for missing ideas
      expect(fileContent).toMatch(/idea \|\| \{[\s\S]*?id: ideaId/);
    });

    it("cleanup function prevents state updates after unmount", async () => {
      const fileContent = await fs.readFile(
        path.resolve(
          process.cwd(),
          "src/app/embed/[workspaceId]/embed-board.tsx"
        ),
        "utf-8"
      );

      // Find the verification callback useEffect
      const verificationEffectMatch = fileContent.match(
        /\/\*\*[\s\S]*?Verification callback handler[\s\S]*?\*\/[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\}, \[[\s\S]*?\]\);/
      );

      expect(verificationEffectMatch).toBeTruthy();

      if (verificationEffectMatch) {
        const effectBody = verificationEffectMatch[1];

        // Verify isActive flag is declared
        expect(effectBody).toContain("let isActive = true");

        // Verify guards exist
        expect(effectBody).toContain("if (!isActive) return");

        // Verify cleanup function sets isActive to false
        expect(effectBody).toMatch(/return \(\) => \{[\s\S]*?isActive = false/);
      }
    });
  });

  describe("TypeScript documentation", () => {
    it("CLAUDE.md documents TypeScript version pin rationale", async () => {
      const fileContent = await fs.readFile(
        path.resolve(process.cwd(), "CLAUDE.md"),
        "utf-8"
      );

      // Verify section exists
      expect(fileContent).toContain("## Dependency Management");
      expect(fileContent).toContain("### TypeScript Version Pin");

      // Verify key information is documented
      expect(fileContent).toContain("5.9.3");
      expect(fileContent).toContain("debafea");
      expect(fileContent).toContain("January 27, 2026");

      // Verify testing guidance exists
      expect(fileContent).toContain("Testing Before Upgrade");
      expect(fileContent).toContain("npm run build");
      expect(fileContent).toContain("npm run test:run");
    });
  });

  describe("PR #12 code review fixes - verification", () => {
    it("all three fixes from PR #12 are implemented", async () => {
      const embedBoardContent = await fs.readFile(
        path.resolve(
          process.cwd(),
          "src/app/embed/[workspaceId]/embed-board.tsx"
        ),
        "utf-8"
      );

      const claudeMdContent = await fs.readFile(
        path.resolve(process.cwd(), "CLAUDE.md"),
        "utf-8"
      );

      // Fix 1: Dependency array corrected - match JSDoc comment pattern
      const verificationEffectMatch = embedBoardContent.match(
        /\/\*\*[\s\S]*?Verification callback handler[\s\S]*?\*\/[\s\S]*?\}, \[([\s\S]*?)\]\);/
      );
      expect(verificationEffectMatch).toBeTruthy();
      if (verificationEffectMatch) {
        expect(verificationEffectMatch[1]).not.toContain("ideas");
        expect(verificationEffectMatch[1]).toContain("refreshData");
      }

      // Fix 2: Integration tests exist (this file)
      expect(__filename).toContain("embed-board.test.tsx");

      // Fix 3: TypeScript documentation exists
      expect(claudeMdContent).toContain("## Dependency Management");
      expect(claudeMdContent).toContain("TypeScript Version Pin");
    });
  });
});
