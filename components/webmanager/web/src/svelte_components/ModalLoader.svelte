<script lang="ts">
    var active=false;
    export function setModal(state:boolean){
        active=state;
  }
</script>

<div class="modal" style:display={active?"flex":"none"}><span class="loader"></span></div>

<style lang="scss">
    .loader {
        width: 64px;
        height: 64px;
        border: 5px solid #fff;
        border-bottom-color: #ff3d00;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
    }

    .modal {
        display: none; /* Hidden by default flex none */
        position: fixed; /* Stay in place */
        z-index: 1000; /* Sit on top */
        align-items: center;
        justify-content: center;
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: hidden; /* Enable scroll if needed */
        background-color: rgb(0, 0, 0); /* Fallback color */
        background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
    }

    @keyframes rotation {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }
</style>
