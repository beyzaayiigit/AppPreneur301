import * as FileSystem from 'expo-file-system/legacy';

const KPI_FILE = `${FileSystem.documentDirectory ?? ''}lumeris_kpi.json`;

type KpiPayload = {
  launches: number;
  lastLaunchAt: number | null;
  firstEditMs: number | null;
  firstEditRecordedAt: number | null;
};

const empty: KpiPayload = {
  launches: 0,
  lastLaunchAt: null,
  firstEditMs: null,
  firstEditRecordedAt: null,
};

async function read(): Promise<KpiPayload> {
  try {
    const info = await FileSystem.getInfoAsync(KPI_FILE);
    if (!info.exists) return { ...empty };
    const raw = await FileSystem.readAsStringAsync(KPI_FILE);
    return { ...empty, ...JSON.parse(raw) } as KpiPayload;
  } catch {
    return { ...empty };
  }
}

async function write(data: KpiPayload): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(KPI_FILE, JSON.stringify(data, null, 2));
}

let launchStartedAt = Date.now();

export function markLaunchStarted(): void {
  launchStartedAt = Date.now();
}

export async function recordAppLaunch(): Promise<void> {
  const cur = await read();
  cur.launches += 1;
  cur.lastLaunchAt = Date.now();
  await write(cur);
}

/** İlk anlamlı düzenleme (preset değişimi veya slider) sonrası time-to-first-edit (ms). */
export async function recordFirstEditIfNeeded(): Promise<void> {
  const cur = await read();
  if (cur.firstEditMs != null) return;
  cur.firstEditMs = Date.now() - launchStartedAt;
  cur.firstEditRecordedAt = Date.now();
  await write(cur);
}

export async function getKpiSummary(): Promise<KpiPayload> {
  return read();
}
