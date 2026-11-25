"use client";

import type L from "leaflet";
import { LocateFixed, MapPinPlus, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  archivePostingAreaAction,
  assignPostingAreaAction,
  createPostingAreaAction,
  recordPostingProgressAction,
} from "@/features/posting-map/actions/posting-actions";
import { STATUS_CONFIG } from "@/features/shared/constants/status-config";
import {
  DEFAULT_MAP_ZOOM,
  FUKUTSU_CENTER,
  WORK_STATUS_ORDER,
} from "@/lib/constants/app";
import type { PostingArea, UserRole, WorkStatus } from "@/lib/types/domain";

interface PostingMapProps {
  areas: PostingArea[];
  currentUserRole: UserRole;
}

export function PostingMap({ areas, currentUserRole }: PostingMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const locationLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selected, setSelected] = useState<PostingArea | null>(null);
  const [assignmentLabel, setAssignmentLabel] = useState("");
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [deliveredIncrement, setDeliveredIncrement] = useState(0);
  const [filter, setFilter] = useState<WorkStatus | "all">("all");
  const [drawing, setDrawing] = useState(false);
  const [draftGeometry, setDraftGeometry] = useState<PostingArea["geometry"] | null>(
    null,
  );
  const [areaCode, setAreaCode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [targetCount, setTargetCount] = useState("");
  const [areaNote, setAreaNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleAreas = useMemo(
    () => areas.filter((area) => filter === "all" || area.status === filter),
    [areas, filter],
  );

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      if (!containerRef.current || mapRef.current) return;
      try {
        const leaflet = (await import("leaflet")).default;
        await import("@geoman-io/leaflet-geoman-free");
        if (disposed || !containerRef.current) return;

        const map = leaflet
          .map(containerRef.current, { maxZoom: 18 })
          .setView(FUKUTSU_CENTER, DEFAULT_MAP_ZOOM);
        leaflet
          .tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
            attribution:
              '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>',
            maxZoom: 18,
          })
          .addTo(map);
        mapRef.current = map;
        layerRef.current = leaflet.layerGroup().addTo(map);
        locationLayerRef.current = leaflet.layerGroup().addTo(map);
        map.pm.setLang("ja", {
          tooltips: {
            firstVertex: "クリックして最初の点を置く",
            continueLine: "クリックして次の点を置く",
            finishPoly: "最初の点を押して区域を閉じる",
          },
          actions: {
            finish: "完了",
            cancel: "キャンセル",
            removeLastVertex: "最後の点を削除",
          },
        });
        map.on("pm:create", (event) => {
          const feature = (event.layer as L.Polygon).toGeoJSON();
          map.removeLayer(event.layer);
          setDrawing(false);
          if (feature.geometry.type !== "Polygon") {
            setMessage("区域の形を読み取れませんでした。もう一度お試しください。");
            return;
          }
          setDraftGeometry({
            type: "Polygon",
            coordinates: feature.geometry.coordinates,
          });
          setSelected(null);
          setAreaCode("");
          setAreaName("");
          setTargetCount("");
          setAreaNote("");
        });
        map.on("pm:drawend", () => setDrawing(false));
        setMapError("");
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 50);
      } catch (error) {
        console.error("ポスティング地図の初期化に失敗しました。", error);
        if (!disposed) {
          setMapError("地図を読み込めませんでした。ページを再読み込みしてください。");
        }
      }
    }
    void initialize();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      locationLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    async function redraw() {
      const layer = layerRef.current;
      if (!layer) return;
      const leaflet = (await import("leaflet")).default;
      layer.clearLayers();

      for (const area of visibleAreas) {
        const status = STATUS_CONFIG[area.status];
        const latLngs = area.geometry.coordinates[0].map(
          ([longitude, latitude]) => [latitude, longitude] as [number, number],
        );
        const polygon = leaflet
          .polygon(latLngs, {
            color: status.color,
            fillColor: status.fillColor,
            fillOpacity: 0.52,
            weight: 3,
          })
          .bindTooltip(
            `${area.areaCode} ${area.name}<br>${status.label} / ${area.deliveredCount}部`,
          )
          .on("click", () => {
            setMessage("");
            setDeliveredIncrement(0);
            setAssignmentLabel(area.assigneeLabel ?? area.assignee?.displayName ?? "");
            setEditingAssignment(false);
            setSelected(area);
          });
        layer.addLayer(polygon);
      }
    }
    void redraw();
  }, [mapReady, visibleAreas]);

  function update(status: WorkStatus) {
    if (!selected) return;
    setMessage("");
    startTransition(async () => {
      const result = await recordPostingProgressAction({
        areaId: selected.id,
        expectedVersion: selected.version,
        status,
        deliveredIncrement,
        requestId: crypto.randomUUID(),
        note: selected.note,
      });
      setMessage(result.message);
      if (result.ok) setSelected(null);
    });
  }

  function updateAssignment() {
    if (!selected) return;
    setMessage("");
    startTransition(async () => {
      const result = await assignPostingAreaAction({
        areaId: selected.id,
        expectedVersion: selected.version,
        assigneeLabel: assignmentLabel,
      });
      setMessage(result.message);
      if (result.ok) setSelected(null);
    });
  }

  function archiveSelectedArea() {
    if (!selected) return;
    if (
      !window.confirm(
        `「${selected.name}」を削除しますか？\n画面から非表示になりますが、操作履歴は残ります。`,
      )
    ) {
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await archivePostingAreaAction({
        areaId: selected.id,
        expectedVersion: selected.version,
      });
      setMessage(result.message);
      if (!result.ok) return;
      setSelected(null);
      router.refresh();
    });
  }

  function startDrawing() {
    const map = mapRef.current;
    if (!map) return;
    setMessage("");
    setSelected(null);
    setDraftGeometry(null);
    setDrawing(true);
    map.pm.setPathOptions({
      color: "#862D39",
      fillColor: "#862D39",
      fillOpacity: 0.25,
    });
    map.pm.enableDraw("Polygon", {
      snappable: true,
      snapDistance: 20,
    });
  }

  function cancelDrawing() {
    mapRef.current?.pm.disableDraw();
    setDrawing(false);
  }

  function saveArea() {
    if (!draftGeometry) return;
    setMessage("");
    startTransition(async () => {
      const result = await createPostingAreaAction({
        areaCode,
        name: areaName,
        geometry: draftGeometry,
        targetCount: targetCount === "" ? null : Number(targetCount),
        note: areaNote || null,
        requestId: crypto.randomUUID(),
      });
      setMessage(result.message);
      if (!result.ok) return;
      setDraftGeometry(null);
      router.refresh();
    });
  }

  async function showCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("この端末では現在地を取得できません。");
      return;
    }
    setMessage("現在地を確認しています…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const map = mapRef.current;
        const layer = locationLayerRef.current;
        if (!map || !layer) return;
        const leaflet = (await import("leaflet")).default;
        layer.clearLayers();
        leaflet
          .circle([coords.latitude, coords.longitude], {
            radius: Math.max(coords.accuracy, 20),
            color: "#2563eb",
            fillColor: "#60a5fa",
            fillOpacity: 0.15,
            weight: 2,
          })
          .addTo(layer);
        leaflet
          .circleMarker([coords.latitude, coords.longitude], {
            radius: 8,
            color: "#ffffff",
            fillColor: "#2563eb",
            fillOpacity: 1,
            weight: 3,
          })
          .bindTooltip("現在地")
          .addTo(layer);
        map.flyTo([coords.latitude, coords.longitude], Math.max(map.getZoom(), 15));
        setMessage("現在地を表示しました。位置情報は保存しません。");
      },
      () =>
        setMessage(
          "現在地を取得できませんでした。端末の位置情報設定をご確認ください。",
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <div className="map-workspace">
      <fieldset className="map-toolbar">
        <legend className="visually-hidden">配布状況の絞り込み</legend>
        <button
          className={filter === "all" ? "filter-chip active" : "filter-chip"}
          onClick={() => setFilter("all")}
          type="button"
        >
          すべて <strong>{areas.length}</strong>
        </button>
        {WORK_STATUS_ORDER.map((status) => (
          <button
            className={filter === status ? "filter-chip active" : "filter-chip"}
            key={status}
            onClick={() => setFilter(status)}
            type="button"
          >
            <span
              className="status-dot"
              style={{ backgroundColor: STATUS_CONFIG[status].color }}
            />
            {STATUS_CONFIG[status].label}
          </button>
        ))}
      </fieldset>
      <div className="map-utility-bar">
        {currentUserRole === "admin" ? (
          drawing ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={cancelDrawing}
            >
              描画をやめる
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!mapReady}
              onClick={startDrawing}
            >
              <MapPinPlus size={18} aria-hidden /> 区域を追加
            </button>
          )
        ) : null}
        <button
          className="button button-secondary"
          type="button"
          disabled={!mapReady}
          onClick={showCurrentLocation}
        >
          <LocateFixed size={18} aria-hidden /> 現在地
        </button>
        {drawing ? (
          <span>地図上に点を置き、最初の点を押して区域を閉じます。</span>
        ) : null}
      </div>
      <div className="map-shell">
        <section
          ref={containerRef}
          className="leaflet-map"
          aria-label="福津市の配布区域地図"
        />
        {areas.some((area) => area.isSample) ? (
          <div className="sample-map-notice">架空の試作区域が含まれています</div>
        ) : null}
        {mapError ? <div className="map-error-message">{mapError}</div> : null}
      </div>

      {message ? <p className="toast-message">{message}</p> : null}

      {draftGeometry ? (
        <aside className="map-drawer" aria-label="新しい配布区域の登録">
          <button
            className="icon-button drawer-close"
            type="button"
            onClick={() => setDraftGeometry(null)}
            aria-label="閉じる"
          >
            <X size={22} />
          </button>
          <p className="eyebrow">管理者用</p>
          <h2>新しい区域を登録</h2>
          <div className="posting-area-form">
            <label>
              区域番号 <span>必須</span>
              <input
                value={areaCode}
                maxLength={40}
                placeholder="例：A-01"
                onChange={(event) => setAreaCode(event.target.value)}
              />
            </label>
            <label>
              区域名 <span>必須</span>
              <input
                value={areaName}
                maxLength={120}
                placeholder="例：西福間1丁目 東側"
                onChange={(event) => setAreaName(event.target.value)}
              />
            </label>
            <label>
              目標部数
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                value={targetCount}
                onChange={(event) => setTargetCount(event.target.value)}
              />
            </label>
            <label>
              メモ
              <textarea
                value={areaNote}
                maxLength={300}
                rows={3}
                placeholder="目印や配布時の注意点など"
                onChange={(event) => setAreaNote(event.target.value)}
              />
            </label>
            <div className="assignment-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={pending || !areaCode.trim() || !areaName.trim()}
                onClick={saveArea}
              >
                {pending ? "登録中…" : "この区域を登録"}
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={pending}
                onClick={() => setDraftGeometry(null)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </aside>
      ) : selected ? (
        <aside className="map-drawer" aria-label="配布区域の詳細">
          <button
            className="icon-button drawer-close"
            type="button"
            onClick={() => setSelected(null)}
            aria-label="閉じる"
          >
            <X size={22} />
          </button>
          <p className="eyebrow">{selected.areaCode} / 架空データ</p>
          <h2>{selected.name}</h2>
          <dl className="detail-list">
            <div>
              <dt>現在の状態</dt>
              <dd>{STATUS_CONFIG[selected.status].label}</dd>
            </div>
            <div>
              <dt>担当</dt>
              <dd>
                {currentUserRole === "admin" && editingAssignment ? (
                  <div className="assignment-control">
                    <input
                      aria-label="担当名"
                      type="text"
                      maxLength={80}
                      value={assignmentLabel}
                      disabled={pending}
                      placeholder="例：藤井、北川・藤井、A班"
                      onChange={(event) => setAssignmentLabel(event.target.value)}
                    />
                    <small>空欄で保存すると未割当に戻ります。</small>
                    <div className="assignment-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={pending}
                        onClick={updateAssignment}
                      >
                        保存
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setAssignmentLabel(
                            selected.assigneeLabel ??
                              selected.assignee?.displayName ??
                              "",
                          );
                          setEditingAssignment(false);
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="assignment-display">
                    <span>
                      {selected.assigneeLabel ??
                        selected.assignee?.displayName ??
                        "未割当"}
                    </span>
                    {currentUserRole === "admin" ? (
                      <button
                        className="assignment-edit-button"
                        type="button"
                        onClick={() => setEditingAssignment(true)}
                      >
                        <Pencil size={15} aria-hidden /> 編集
                      </button>
                    ) : null}
                  </div>
                )}
              </dd>
            </div>
            <div>
              <dt>配布済み</dt>
              <dd>{selected.deliveredCount}部</dd>
            </div>
            <div>
              <dt>目標</dt>
              <dd>{selected.targetCount ? `${selected.targetCount}部` : "未設定"}</dd>
            </div>
          </dl>
          {currentUserRole === "viewer" ? (
            <p className="readonly-note">閲覧のみのため更新できません。</p>
          ) : (
            <>
              <label className="count-field">
                今回配布した部数
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={5000}
                  value={deliveredIncrement}
                  onChange={(event) =>
                    setDeliveredIncrement(Number(event.target.value) || 0)
                  }
                />
              </label>
              <div className="status-action-grid">
                {WORK_STATUS_ORDER.map((status) => (
                  <button
                    type="button"
                    key={status}
                    disabled={pending}
                    onClick={() => update(status)}
                    style={{ borderColor: STATUS_CONFIG[status].color }}
                  >
                    {STATUS_CONFIG[status].label}
                  </button>
                ))}
              </div>
              {currentUserRole === "admin" ? (
                <div className="area-delete-section">
                  <p>削除すると、この区域は地図と進捗集計から非表示になります。</p>
                  <button
                    className="button button-danger"
                    type="button"
                    disabled={pending}
                    onClick={archiveSelectedArea}
                  >
                    <Trash2 size={17} aria-hidden /> 区域を削除
                  </button>
                </div>
              ) : null}
            </>
          )}
        </aside>
      ) : null}
    </div>
  );
}
