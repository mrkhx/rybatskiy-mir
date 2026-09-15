import { OLD_BRIDGE_3D, oldBridgeStandingAnchor } from "./oldBridge3d";

export type BridgeCalibration = { u: number; v: number; feetOffset: number; scale: number; yaw: number };
export const INITIAL_BRIDGE_CALIBRATION: BridgeCalibration = {
  ...oldBridgeStandingAnchor, feetOffset: 0, scale: OLD_BRIDGE_3D.scale, yaw: OLD_BRIDGE_3D.spotFacingYaw,
};

export function OldBridgeCalibration({ value, onChange }: {
  value: BridgeCalibration; onChange: (next: BridgeCalibration) => void;
}) {
  return <aside style={{ position: "absolute", top: 90, left: 12, zIndex: 50, padding: 12,
    background: "#102128ee", color: "white", pointerEvents: "auto", fontSize: 12 }}>
    <strong>Старый мостик · калибровка READY</strong>
    <p>Предварительные значения — нужна визуальная проверка.</p>
    {(["u", "v", "feetOffset", "scale", "yaw"] as const).map((key) => <label key={key}
      style={{ display: "flex", justifyContent: "space-between", gap: 8, margin: "5px 0" }}>
      {key === "u" || key === "v" ? `standing ${key}` : key}
      <input type="number" step={key === "yaw" ? .01 : .001} value={value[key]}
        min={key === "u" || key === "v" ? 0 : key === "scale" ? .01 : undefined}
        max={key === "u" || key === "v" ? 1 : undefined}
        onChange={(event) => {
          const number = event.target.valueAsNumber;
          if (!Number.isFinite(number) || (key === "scale" && number <= 0)) return;
          onChange({ ...value, [key]: key === "u" || key === "v" ? Math.max(0, Math.min(1, number)) : number });
        }} style={{ width: 80 }} />
    </label>)}
    <button type="button" onClick={() => onChange(INITIAL_BRIDGE_CALIBRATION)}>Сбросить</button>
  </aside>;
}
