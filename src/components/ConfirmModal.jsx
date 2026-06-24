export default function ConfirmModal({ open, title, message, confirmLabel = "Да", cancelLabel = "Отмена", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <>
      <div className="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        {message && <p>{message}</p>}
        <div className="confirmModalActions">
          <button type="button" className="confirmModalCancel" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="confirmModalConfirm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
      <button type="button" className="shade open" onClick={onCancel} aria-label="Закрыть" />
    </>
  );
}
