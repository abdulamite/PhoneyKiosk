<template>
<div class="formHeader">
    <img v-if="locationImage" v-bind:src="locationImage" alt="logo">
    <h1>{{locationDescription}}</h1>
    <p v-if="!locationImage">This is the PhoneyKiosk. The purpose of this application is show a more intuitive interface for the mobile kiosk experience. Currently the mobile kiosk employs a “Kiosk” like experience which is strange from a UX/UI prospective because this is not native to the mobile experience. By making use of a simple form we create a more intuitive user experience that is much more scaleable by being able to break up features into loadable components.</p>
</div>
</template>

<script>
import axios from "axios";
const parseString = require("xml2js").parseString;

export default {
    name: 'FormHeader',
    data: function () {
        return {
            locationDescription: "PhoneyKiosk",
            locationImage: "",
        }
    },
    mounted: async function () {
        if(!this.$route.params.locationId){
            return;
        }
        let locationDescription = await axios.get(`http://localhost:3000/qless/api/v1/kiosk/locations/${this.$route.params.locationId}`)
            .then((response) => {
                let xml = response.data;
                let locationDescription = "";
                parseString(xml, function (err, results) {
                    if (err) {
                        console.log("could not parse XML");
                    } else {
                        if (results && results.merchantLocations) {
                            locationDescription = results.merchantLocations.merchantLocation[0].description[0];
                        }
                    }
                });
                return locationDescription;
            }).catch(error => {
                console.log(error);
            });
        this.locationDescription = locationDescription;

        axios.get(`http://localhost:3000/themeManager/api/v1/img/location/${this.$route.params.locationId}/kiosk/blue/logo.png`)
            .then(() => {
                this.locationImage = `/themeManager/api/v1/img/location/${this.$route.params.locationId}/kiosk/blue/logo.png`;
            }).catch(error => {
                console.log(error)
            })
    }
}
</script>

<style scoped>
.formHeader {
    text-align: center;
}

img {
    height: 5rem;
}
</style>
