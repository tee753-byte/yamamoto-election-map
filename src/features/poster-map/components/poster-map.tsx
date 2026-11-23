"use client";

import type L from "leaflet";
import { Crosshair, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updatePosterWorkAction } from "@/features/poster-map/actions/poster-actions";
import { STATUS_CONFIG } from "@/features/shared/constants/status-config";
import {
  DEFAULT_MAP_ZOOM,
  FUKUTSU_CENTER,
  WORK_STATUS_ORDER,
} from "@/lib/constants/app";
import type { Candidate, PosterWork, UserRole, WorkStatus } from "@/lib/types/domain";

interface PosterMapProps {
  candidate: Candidate;
  workItems: PosterWork[];
  currentUserRole: UserRole;
}

export function PosterMap({ candidate, workItems, currentUserRole }: PosterMapProps) {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<PosterWork | null>(null);
  const [filter, setFilter] = useState<WorkStatus | "all">("all");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleItems = useMemo(
    () => workItems.filter((item) => filter === "all" || item.status === filter),
    [filter, workItems],
  );

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      if (!containerRef.current || mapRef.current) return;
      const leaflet = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      const map = leaflet
        .map(containerRef.current, { zoomControl: true, maxZoom: 18 })
        .setView(FUKUTSU_CENTER, DEFAULT_MAP_ZOOM);

      leaflet
        .tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
          attribution:
            '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>',
          maxZoom: 18,
        })
        .addTo(map);

      mapRef.current = map;
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 50);
    }

    void initialize();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    async function redraw() {
      const map = mapRef.current;
      const layer = markerLayerRef.current;
      if (!map || !layer) return;
      const leaflet = (await import("leaflet")).default;
      layer.clearLayers();

      for (const item of visibleItems) {
        const status = STATUS_CONFIG[item.status];
        const marker = leaflet
          .circleMarker([item.board.latitude, item.board.longitude], {
            radius: 11,
            color: "#ffffff",
            weight: 3,
            fillColor: status.color,
            fillOpacity: 1,
          })
          .bindTooltip(
            `#${item.board.boardNumber} ${status.label}<br>${item.board.locationHint}`,
          )
          .on("click", () => {
            setMessage("");
            setSelected(item);
          });
        layer.addLayer(marker);
      }
    }

    void redraw();
  }, [mapReady, visibleItems]);

  function locate() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((position) => {
      mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 16);
    });
  }

  function updateStatus(status: WorkStatus) {
    if (!selected) return;
    setMessage("");
    startTransition(async () => {
      const result = await updatePosterWorkAction({
        workId: selected.id,
        expectedVersion: selected.version,
        status,
        note: selected.note,
      });
      setMessage(result.message);
      if (result.ok) setSelected(null);
    });
  }

  return (
    <div className="map-workspace">
      <fieldset className="map-toolbar">
        <legend className="visually-hidden">掲示状況の絞り込み</legend>
        <button
          className={filter === "all" ? "filter-chip active" : "filter-chip"}
          onClick={() => setFilter("all")}
          type="button"
        >
          すべて <strong>{workItems.length}</strong>
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

      <div className="map-shell">
        <section
          ref={containerRef}
          className="leaflet-map"
          aria-label="福津市の掲示場地図"
        />
        <button className="map-locate-button" type="button" onClick={locate}>
          <Crosshair size={18} aria-hidden />
          現在地
        </button>
        <div className="sample-map-notice">すべて架空の掲示場です</div>
      </div>

      {message ? <p className="toast-message">{message}</p> : null}

      {selected ? (
        <aside className="map-drawer" aria-label="掲示場の詳細">
          <button
            className="icon-button drawer-close"
            type="button"
            onClick={() => setSelected(null)}
            aria-label="閉じる"
          >
            <X size={22} />
          </button>
          <p className="eyebrow">{candidate.displayName} / 架空データ</p>
          <h2>掲示場 #{selected.board.boardNumber}</h2>
          <p>{selected.board.locationHint}</p>
          <dl className="detail-list">
            <div>
              <dt>現在の状態</dt>
              <dd>{STATUS_CONFIG[selected.status].label}</dd>
            </div>
            <div>
              <dt>担当</dt>
              <dd>{selected.assignee?.displayName ?? "未割当"}</dd>
            </div>
          </dl>
          {currentUserRole === "viewer" ? (
            <p className="readonly-note">閲覧のみのため更新できません。</p>
          ) : (
            <div className="status-action-grid">
              {WORK_STATUS_ORDER.map((status) => (
                <button
                  type="button"
                  key={status}
                  disabled={pending || selected.status === status}
                  onClick={() => updateStatus(status)}
                  style={{ borderColor: STATUS_CONFIG[status].color }}
                >
                  {STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}
