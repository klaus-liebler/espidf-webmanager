<script lang="ts">
  import { Severity, severity2class, severity2symbol } from '../utils/common'
  import {type IDialogBodyRenderer } from "../utils/interfaces"
  enum Mode {
    CUSTOM_RENDERER,
    OK,
    OK_CANCEL,
    FILENAME,
    PASSWORD,
  }

  var heading = ''
  var severity: Severity = Severity.ERROR
  var right = ''

  var dialog: HTMLDialogElement
  var bodyRight: HTMLElement

  var handler: ((ok: boolean, value: string) => any)|undefined;
  var mode = Mode.OK
  var inputElement: HTMLInputElement | null
  export var inputValue: string="";

  function prepareDialog(pHeading: string, pSeverity: Severity, pMessage: string, pMode: Mode, pHandler?: ((ok: boolean, value: string) => any)) {
    heading = pHeading;
    severity = pSeverity;
    mode = pMode;
    handler = pHandler;
    right=pMessage;
  }

  function ok_handler() {
    dialog.close('OK')
    if (mode == Mode.FILENAME || mode == Mode.PASSWORD) {
      handler?.(true, inputValue)
    } else if (mode == Mode.CUSTOM_RENDERER) {
      handler?.(true, inputElement?.value ?? '')
    } else {
      handler?.(true, '')
    }
  }

  function cancel_handler() {
    dialog.close('Cancel')
    handler?.(false, '')
  }

  export function showDialog(head: string, renderer: IDialogBodyRenderer, pHandler?: ((ok: boolean, value: string) => any)) {
    prepareDialog(head, Severity.INFO, '', Mode.CUSTOM_RENDERER, pHandler)
    inputElement = renderer.Render(bodyRight)
    dialog.showModal()
  }

  export function showEnterFilenameDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)) {
    prepareDialog('Enter Filename', Severity.INFO, messageText, Mode.FILENAME, pHandler)
    dialog.showModal()
  }

  export function showEnterPasswordDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)) {
    prepareDialog('Enter Password', Severity.INFO, messageText, Mode.PASSWORD, pHandler)
    dialog.showModal()
  }

  export function showOKDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any) ): HTMLDialogElement {
    prepareDialog('Notification', pSeverity, messageText, Mode.OK, pHandler)
    dialog.showModal()
    return dialog
  }

  export function showOKCancelDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any)): HTMLDialogElement {
    prepareDialog('Notification', pSeverity, messageText, Mode.OK_CANCEL, pHandler)
    dialog.showModal()
    return dialog
  }

  function do_focus(el: HTMLElement) {
    el.focus()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog bind:this={dialog} on:click|self={() => cancel_handler()}>
  <!--last evt handler means: close, when clicking on backdrop-->
  <header>
    <span>{heading}</span>
    <button type="button" on:click={() => cancel_handler()}>&times;</button>
  </header>
  <main>
    <section><span class={severity2class(severity)}>{severity2symbol(severity)}</span></section>
    <section bind:this={bodyRight}>
      {#if mode == Mode.CUSTOM_RENDERER}
        {@html right}
      {:else if mode == Mode.OK || mode == Mode.OK_CANCEL}
        <p>{right}</p>
      {:else if mode == Mode.FILENAME}
        <p>{right}</p>
        <input
          bind:value={inputValue}
          use:do_focus
          on:keyup={(e) => {
            if (e.key == 'Enter') ok_handler()
          }}
          type="text"
          pattern="^[A-Za-z0-9]\{(1, 10)}$"
        />
      {:else if mode == Mode.PASSWORD}
        <p>{right}</p>
        <input
          bind:value={inputValue}
          use:do_focus
          on:keyup={(e) => {
            if (e.key == 'Enter') ok_handler()
          }}
          type="password"
        />
      {/if}
    </section>
  </main>
  <footer>
    <input type="button" value="OK" on:click={() => ok_handler()} />
    {#if mode != Mode.OK}
      <input type="button" value="Cancel" on:click={() => cancel_handler()} />
    {/if}
  </footer>
</dialog>

<style lang="scss">
  $blue-3: hsl(211, 57%, 25%);
  $blue-4: hsl(211, 39%, 44%);
  $blue-5: hsl(211, 51%, 65%);
  $blue-7: hsl(211, 90%, 93%);
  $blue-rich: hsl(211, 65%, 48%);

  dialog {
    padding: 0;
    border: 0;
    border-radius: 0.6rem;
    box-shadow: 0 0 1em black;
    min-width: 30vw;

    header > button {
      position: absolute;
      top: 0.2em;
      right: 0.2em;
      padding: 0.3em;
      line-height: 0.6;
      background-color: transparent;
      border: 0;
      font-size: 2em;
    }

    header > button:hover {
      background-color: grey;
    }

    header,
    main,
    footer {
      padding: 1em;
    }

    main {
      display: grid;
      grid-template-columns: 50px 1fr;
    }

    header {
      margin: 0;
      padding-bottom: 0.6em;
      background-color: $blue-7;
      border-top-left-radius: 0.6rem;
      border-top-right-radius: 0.6rem;
      border-bottom: 1px solid $blue-5;
    }

    main > section:nth-child(1) {
      font-size: xx-large;
    }

    footer {
      border-top: 1px solid $blue-5;

      button {
        padding: 0.4em 1em 0.2em;
      }
    }
  }

  dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.4);
  }

  dialog[open] {
    animation: slide-up 0.4s ease-out;
  }

  .gr {
    color: green;
  }

  .rd {
    color: red;
  }

  .ye {
    color: orange;
  }
</style>
