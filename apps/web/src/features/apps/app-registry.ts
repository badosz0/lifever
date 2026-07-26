import { House } from "lucide-react";

import { lifeverFeatureApps } from "@/features/apps/feature-app-registry";
import { HomeView } from "@/features/home/home-view";

import type {
  HomeAppDefinition,
  LifeverAppDefinition,
} from "./model/types";

export const homeApp = {
  id: "home",
  kind: "home",
  label: "Home",
  icon: House,
  View: HomeView,
} satisfies HomeAppDefinition;

export const lifeverApps: LifeverAppDefinition[] = [
  homeApp,
  ...lifeverFeatureApps,
];

export const lifeverAppsById = new Map(
  lifeverApps.map((app) => [app.id, app]),
);
