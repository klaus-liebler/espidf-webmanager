<script lang="ts">
    import 'chartist/dist/index.css';
    import { BarChart } from 'chartist'
    import { onMount } from 'svelte'
    let portfolio: HTMLDivElement


    onMount(() => {
        new BarChart(
            portfolio,
            {
                labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'],
                series: [[1, 2, 4, 8, 6, -2, -1, -4, -6, -2]],
            },
            {
                high: 10,
                low: -10,
                axisX: {
                    labelInterpolationFnc: (value, index) => (index % 2 === 0 ? value : null),
                },
            },
        )
    })
</script>

<div bind:this={portfolio} style="width: 600px; height:400px" />
