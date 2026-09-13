import { createFileRoute } from "@tanstack/react-router";
import { RodLab } from "@/rig3d/RodLab";

export const Route = createFileRoute("/dev/rod")({ component: RodLab });
