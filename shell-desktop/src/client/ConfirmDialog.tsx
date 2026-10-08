/** Shared modal confirmation for destructive panel actions. */

import { useEffect, useRef } from 'react'

/** Confirmation dialog props. */
export interface ConfirmDialogProps {
  /** Dialog heading naming the destructive action. */
  readonly title: string
  /** Optional explanatory sentence shown under the heading. */
  readonly body?: string
  /** Confirm button label. */
  readonly confirmLabel: string
  /** Cancel button label. */
  readonly cancelLabel: string
  /** While true the confirmed action is in flight and both buttons stay disabled. */
  readonly busy?: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/**
 * Centered modal card over the whole window. Escape and a backdrop click
 * cancel (never while `busy`), and the confirm button takes focus on open so
 * the keyboard flow lands on the action the dialog is about.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { confirmRef.current?.focus() }, [])
  return (
    <div
      className="dshAishellDialogBackdrop"
      data-aishell-confirm=""
      onMouseDown={() => { if (props.busy !== true) props.onCancel() }}
      onKeyDown={event => { if (event.key === 'Escape' && props.busy !== true) props.onCancel() }}
    >
      <div
        className="dshAishellDialog"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onMouseDown={event => { event.stopPropagation() }}
      >
        <strong className="dshAishellDialogTitle">{props.title}</strong>
        {props.body !== undefined && <p className="dshAishellDialogBody">{props.body}</p>}
        <div className="dshAishellDialogActions">
          <button type="button" className="dshAishellPanelAction" disabled={props.busy} onClick={props.onCancel}>
            {props.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="dshAishellPanelAction dshAishellDangerAction"
            disabled={props.busy}
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
