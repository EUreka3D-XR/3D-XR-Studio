// src/components/TourPlannerPanel.jsx
import React, { useMemo, useState } from 'react';
import { useTourPlanner } from '../context/TourPlannerContext';
import { useTranslation } from 'react-i18next';

export default function TourPlannerPanel({
  environmentId,
  onRequestMapClickMode,   // (enabled: boolean) => void
  onZoomToStop,            // (stop) => void
  className = '',
}) {
  const { t } = useTranslation();
  const {
    state,
    setEditing,
    addStop,
    updateStop,
    deleteStop,
    moveStopUp,
    moveStopDown,
    persist,
    loadExisting,
    clearLocal,
  } = useTourPlanner();

  const [selectedStopId, setSelectedStopId] = useState(null);
  const [localEdit, setLocalEdit] = useState({ label: '', description: '', media_url: '' });

  React.useEffect(() => {
    if (environmentId) loadExisting(environmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

  // sincronizza toggle click mappa con eventuale mappa esterna
  React.useEffect(() => {
    if (typeof onRequestMapClickMode === 'function') {
      onRequestMapClickMode(state.editing);
    }
  }, [state.editing, onRequestMapClickMode]);

  const selectedStop = useMemo(
    () => state.stops.find(s => s.id === selectedStopId) || null,
    [state.stops, selectedStopId]
  );

  React.useEffect(() => {
    if (selectedStop) {
      setLocalEdit({
        label: selectedStop.label || '',
        description: selectedStop.description || '',
        media_url: selectedStop.media_url || '',
      });
    } else {
      setLocalEdit({ label: '', description: '', media_url: '' });
    }
  }, [selectedStop]);

  const onSelectRow = (stop) => {
    setSelectedStopId(stop.id);
  };

  const onSaveRow = () => {
    if (!selectedStop) return;
    const payload = {
      label: localEdit.label,
      description: localEdit.description,
      media_url: localEdit.media_url,
    };
    updateStop(selectedStop.id, payload);
  };

  const onAddDummy = () => {
    // utility per test senza mappa: aggiunge un punto vicino al centro corrente
    const baseLat = state.mapCenter?.lat || 43.7711;
    const baseLng = state.mapCenter?.lng || 11.2486;
    const jitter = (Math.random() - 0.5) * 0.002;
    addStop({
      label: `Tappa ${state.stops.length + 1}`,
      description: '',
      lat: +(baseLat + jitter).toFixed(6),
      lng: +(baseLng + jitter).toFixed(6),
      media_url: '',
    });
  };

  const onToggleEdit = () => setEditing(!state.editing);

  const hasUnsaved = state.unsavedChanges;
  const isSaving = state.saving;

  return (
    <div className={`flex flex-col gap-3 p-3 bg-white/80 rounded-xl shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('tourPlanner.title')}</h3>
          <p className="text-xs text-gray-600">
            {state.currentRoute?.id
              ? t('tourPlanner.status.routeInfo', { title: state.currentRoute.title || t('tourPlanner.noTitle'), count: state.stops.length })
              : t('tourPlanner.status.newRouteInfo', { count: state.stops.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleEdit}
            className={`px-3 py-1 rounded-md text-sm ${
              state.editing ? 'bg-emerald-600 text-white' : 'bg-gray-200'
            }`}
            title={t('tourPlanner.hint.clickMap')}
          >
            {state.editing ? t('tourPlanner.modeOn') : t('tourPlanner.modeOff')}
          </button>

          {/* Solo per test: aggiunta rapida senza mappa */}
          <button
            type="button"
            onClick={onAddDummy}
            className="px-3 py-1 rounded-md text-sm bg-slate-200"
            title={t('tourPlanner.hint.addDebug')}
          >
            {t('tourPlanner.addStopTest')}
          </button>
        </div>
      </div>

      {/* Azioni principali */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isSaving || !hasUnsaved || !environmentId}
          onClick={() => persist(environmentId)}
          className={`px-3 py-2 rounded-md text-sm ${
            isSaving || !hasUnsaved || !environmentId
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white'
          }`}
        >
          {isSaving ? t('tourPlanner.saving') : t('tourPlanner.saveRoute')}
        </button>

        <button
          type="button"
          disabled={isSaving || (!state.currentRoute && state.stops.length === 0)}
          onClick={clearLocal}
          className="px-3 py-2 rounded-md text-sm bg-gray-100"
          title={t('tourPlanner.hint.clearDraft')}
        >
          {t('tourPlanner.clearDraft')}
        </button>
      </div>

      {/* Tabella tappe */}
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">{t('tourPlanner.table.label')}</th>
              <th className="px-3 py-2">{t('tourPlanner.table.lat')}</th>
              <th className="px-3 py-2">{t('tourPlanner.table.lng')}</th>
              <th className="px-3 py-2">{t('tourPlanner.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {state.stops.map((s, idx) => (
              <tr
                key={s.id}
                className={`border-t hover:bg-gray-50 cursor-pointer ${
                  selectedStopId === s.id ? 'bg-amber-50' : ''
                }`}
                onClick={() => onSelectRow(s)}
              >
                <td className="px-3 py-2 w-10">{idx + 1}</td>
                <td className="px-3 py-2">{s.label || <span className="text-gray-400">—</span>}</td>
                <td className="px-3 py-2">{s.lat?.toFixed ? s.lat.toFixed(6) : s.lat}</td>
                <td className="px-3 py-2">{s.lng?.toFixed ? s.lng.toFixed(6) : s.lng}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStopUp(s.id);
                      }}
                      className="px-2 py-1 rounded border text-xs"
                      disabled={idx === 0}
                    >
                      {t('tourPlanner.moveUp')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStopDown(s.id);
                      }}
                      className="px-2 py-1 rounded border text-xs"
                      disabled={idx === state.stops.length - 1}
                    >
                      {t('tourPlanner.moveDown')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStop(s.id);
                        if (selectedStopId === s.id) setSelectedStopId(null);
                      }}
                      className="px-2 py-1 rounded border text-xs text-red-700 border-red-300"
                    >
                      {t('tourPlanner.delete')}
                    </button>
                    {typeof onZoomToStop === 'function' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomToStop(s);
                        }}
                        className="px-2 py-1 rounded border text-xs"
                      >
                        {t('tourPlanner.zoom')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {state.stops.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  {t('tourPlanner.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editor tappa selezionata */}
      <fieldset className="mt-2 border border-gray-200 rounded-lg p-3">
        <legend className="px-2 text-sm text-gray-600">{t('tourPlanner.stopDetails')}</legend>
        {selectedStop ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">{t('tourPlanner.table.label')}</label>
                <input
                  value={localEdit.label}
                  onChange={(e) => setLocalEdit(v => ({ ...v, label: e.target.value }))}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder={t('tourPlanner.placeholder.label')}
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-600 mb-1">{t('tourPlanner.table.lat')}</label>
                <input
                  value={selectedStop.lat}
                  disabled
                  className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-600 mb-1">{t('tourPlanner.table.lng')}</label>
                <input
                  value={selectedStop.lng}
                  disabled
                  className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('tourPlanner.extendedDescription')}</label>
              <textarea
                value={localEdit.description}
                onChange={(e) => setLocalEdit(v => ({ ...v, description: e.target.value }))}
                rows={3}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder={t('tourPlanner.placeholder.description')}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('tourPlanner.mediaUrl')}</label>
              <input
                value={localEdit.media_url}
                onChange={(e) => setLocalEdit(v => ({ ...v, media_url: e.target.value }))}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="https://…"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSaveRow}
                className="px-3 py-2 rounded-md text-sm bg-emerald-600 text-white"
              >
                {t('tourPlanner.saveStop')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStopId(null)}
                className="px-3 py-2 rounded-md text-sm bg-gray-100"
              >
                {t('tourPlanner.close')}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">{t('tourPlanner.selectRow')}</div>
        )}
      </fieldset>

      {/* Stato & errori */}
      <div className="text-xs">
        {state.error && <p className="text-red-600">{t('tourPlanner.error')} {String(state.error)}</p>}
        {!state.error && hasUnsaved && <p className="text-amber-700">{t('tourPlanner.unsavedChanges')}</p>}
        {state.currentRoute?.id && !hasUnsaved && (
          <p className="text-green-700">{t('tourPlanner.allSaved', { id: state.currentRoute.id })}</p>
        )}
      </div>
    </div>
  );
}
