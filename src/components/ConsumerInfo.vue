<template>
<div>
    <button @click="alertUser">Emit Event</button>
</div>
</template>

<script>
export default {
    name: "ConsumerInfo",
    data: function () {
        return {};
    },
    methods: {
        alertUser: function () {
            this.$parent.firstName = 'Abdulamite';
        }
    }
};
</script>

<style scoped>
</style>
