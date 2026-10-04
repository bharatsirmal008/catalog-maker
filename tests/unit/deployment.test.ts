import { expect, it } from "vitest";
import { deploymentProblems } from "../../scripts/deployment-check.mjs";
const configured = { APP_URL: "https://catalog-demo.onrender.com", DATABASE_URL: "postgresql://user:password@ep-demo.aws.neon.tech/catalog?sslmode=verify-full", CLOUDINARY_CLOUD_NAME: "test-shop", CLOUDINARY_API_KEY: "fixture-key", CLOUDINARY_API_SECRET: "fixture-secret" };
it("accepts a direct hosted database and HTTPS origin", () => { expect(deploymentProblems(configured)).toEqual([]); });
it("rejects localhost database and origin for hosted startup", () => {
  expect(deploymentProblems({ ...configured, DATABASE_URL: "postgresql://user:password@localhost/catalog", APP_URL: "http://localhost:3000" }).length).toBeGreaterThan(0);
});
it("rejects transaction pooling which cannot hold source-import session locks", () => {
  expect(deploymentProblems({ ...configured, DATABASE_URL: configured.DATABASE_URL.replace("ep-demo.", "ep-demo-pooler.") }).join(" ")).toContain("direct");
});
it("requires TLS verification and complete image configuration", () => {
  expect(deploymentProblems({ ...configured, DATABASE_URL: configured.DATABASE_URL.replace("verify-full", "disable"), CLOUDINARY_API_SECRET: "" }).length).toBe(2);
});
