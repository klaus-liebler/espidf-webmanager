<script lang="ts">
  import { Severity, severity2class, severity2symbol } from '../utils/common'
  var timeout: number = -1
  var message: string = ''
  var show = ""
  var severity = Severity.INFO
  export function showSnackbar(pSeverity: Severity, pMessage: string) {
    if (timeout >= 0) {
      clearInterval(timeout)
    }
    message = pMessage
    show = "show"
    severity = pSeverity
    timeout = <number>(<unknown>setTimeout(() => {
      //<number><unknown> is a dirty hack to make VS Code happy...
      show = ""
      timeout = -1
    }, 3000))
  }
</script>

<div class={show}>
  <span class={severity2class(severity)}>{severity2symbol(severity)}</span><span>{message}</span>
</div>

<style lang="scss">
  div {
    visibility: hidden;
    min-width: 250px; /* Set a default minimum width */
    margin-left: -125px; /* Divide value of min-width by 2 */
    background-color: #4e4d4dcd; /* Black background color */
    color: #fff; /* White text color */
    text-align: center; /* Centered text */
    border-radius: 2px; /* Rounded borders */
    padding: 16px; /* Padding */
    position: fixed; /* Sit on top of the screen */
    z-index: 1; /* Add a z-index if needed */
    left: 50%; /* Center the snackbar */
    bottom: 30px; /* 30px from the bottom */
    
  }

  div.show {
      visibility: visible !important; /* Show the snackbar */
      animation:
        fadein 0.5s,
        fadeout 0.5s 2.5s;
    }

  @keyframes fadein {
    from {
      bottom: 0;
      opacity: 0;
    }
    to {
      bottom: 30px;
      opacity: 1;
    }
  }

  @keyframes fadeout {
    from {
      bottom: 30px;
      opacity: 1;
    }
    to {
      bottom: 0;
      opacity: 0;
    }
  }

  .info {
    color: rgb(102, 249, 102);
  }

  .warn {
    color: yellow;
  }

  .error {
    color: pink;
  }

  .dangerous {
    color: red;
  }
</style>
