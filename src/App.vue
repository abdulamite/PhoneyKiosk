<template>
<div id="app">
    <div class="container">
        <FormHeader />
        <div class="consumerInfo">
            <label for="firstName">First Name:</label>
            <input id="firstName" type="text" name="firstName" v-model="firstName" v-bind:firstName="firstName" />
            <label for="lastName">Last Name:</label>
            <input id="lastName" type="text" name="lastName" v-model="lastName" />
            <label for="consumerPhone">Phone:</label>
            <input id="consumerPhone" @blur="errorCheck" type="tel" name="consumerPhone" v-model="consumerPhone" maxlength="10" @keypress="isNumber($event)" />
        </div>

        <div class="queues" v-if="queues.length > 1">
            <label for="QueueSelect">What would you like to get in line for?</label>
            <select id="QueueSelect" name="QueueSelect" v-model="selectedQueue" @change="getTransactionTypes">
                <option :value="queue" v-for="queue in queues" v-bind:key="queue.id">{{queue.description}}</option>
            </select>
        </div>

        <div class="queues" v-else>
            <p class="no-queues">There are currently no queues available to join</p>
        </div>

        <div class="transaction-types" v-if="selectedQueue && transactionTypes.length > 0">
            <label for="QueueTransactionType">What service do you need help with?</label>
            <select id="QueueTransactionType" name="QueueTransactionType" v-model="selectedTransactionType">
                <option :value="transactionType.id" v-for="transactionType in transactionTypes" v-bind:key="transactionType.id">{{transactionType.description}}</option>
            </select>
        </div>

        <div class="appointment-select" v-if="selectedQueue.appointmentsEnabled && selectedTransactionType">
            <label for="isAppointment">Would you like to make an appointment or walk in?</label>
            <select id="isAppointment" name="isAppointment" v-model="isAppointment">
                <option value="walkin">Walk in</option>
                <option value="appointment">Make an Appointment</option>
            </select>
        </div>

        <div class="appointment-blocks" v-if="selectedQueue.appointmentsEnabled && isAppointment === 'appointment'">
            <label for="selectedDate">Select Date:</label>
            <input id="selectedDate" type="date" :min="today" :max="maxLeadTime" v-model="selectedDate" v-if="selectedTransactionType" @change="getPossibleBlocks" />
            <p v-if="!appointmentBlocks">No appointments available for the selected date</p>
            <transition name="slide-fade">
                <div class="appointment-blocks-list" v-if="appointmentBlocks && selectedDate">
                    <button v-for="block in appointmentBlocks" :key="block.serverTime" @click="selectBlock(block, $event)">{{block.standardFormat}}</button>
                </div>
            </transition>
        </div>

        <transition name="slide-fade">
            <div class="wait-info" v-if="selectedQueue && selectedQueue.wait && isAppointment !=='appointment'">
                <font-awesome-icon icon="clock" />
                <p>Current Wait: {{selectedQueue.wait.duration}} {{selectedQueue.wait.units}}</p>
            </div>
        </transition>

        <div class="join-queue">
            <transition name="slide-fade">
                <button v-on:click="joinQueue" v-if="showJoin && errors.length<1">Join Line Now!</button>
            </transition>

            <transition name="slide-fade">
                <button v-on:click="makeAppointment" v-if="showAppointment  && errors.length<1">Make An Appointment</button>
            </transition>
        </div>

        <transition name="slide-fade">
            <div class="errors" v-if="errors.length>0">
                <div class="error" v-for="error in errors" :key="error.errorCode">
                    <font-awesome-icon icon="exclamation-triangle" />
                    <span>{{error.description}}</span>
                </div>
            </div>
        </transition>

        <div class="branding">
            <hr />
            <img src="https://pbs.twimg.com/profile_images/539580698542108672/wNfNzg_m_400x400.png" alt="QLess Logo" />
            <p>Standard text messaging rates will apply.</p>
            <p>Powered by QLess™️</p>
        </div>
    </div>
</div>
</template>

<script>
import axios from "axios";
const qs = require("querystring");
const parseString = require("xml2js").parseString;
import FormHeader from "./components/FormHeader.vue";

// CommonJS
const Swal = require("sweetalert2");

export default {
    name: "app",
    components: {
        FormHeader,
    },
    data: function () {
        return {
            wssid: null,
            firstName: "",
            lastName: "",
            consumerPhone: "",
            customScreens: [],
            queues: [],
            selectedQueue: "",
            transactionTypes: [],
            selectedTransactionType: "",
            selectedDate: "",
            appointmentBlocks: [],
            selectedTime: "",
            today: new Date().toISOString().split("T")[0],
            maxDate: "",
            isAppointment: "",
            errors: [],
            locationId: 532
        };
    },
    computed: {
        showJoin: function () {
            //
            if (this.transactionTypes.length > 0 && !this.selectedTransactionType) {
                return false;
            } else if (
                this.selectedQueue.appointmentsEnabled &&
                !this.isAppointment
            ) {
                return false;
            } else if (
                this.selectedQueue !== null &&
                this.isAppointment !== "appointment" &&
                this.selectedQueue &&
                (this.consumerPhone || this.firstName)
            ) {
                return true;
            } else {
                return false;
            }
        },
        showAppointment: function () {
            if (
                this.selectedQueue !== null &&
                this.isAppointment === "appointment" &&
                this.selectedDate &&
                this.selectedTime &&
                this.consumerPhone
            ) {
                return true;
            } else {
                return false;
            }
        }
    },
    asyncComputed: {
        maxLeadTime: async function () {
            let days = await axios
                .get(
                    `http://localhost:3000/qless/api/v1/appointment/queuesTransactionTypesResources/${this.locationId}`
                )
                .then(response => {
                    let xml = response.data;
                    let days = 0;
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            if (results && results.queueTransactionTypeResources) {
                                let resource =
                                    results.queueTransactionTypeResources.queue[0]
                                    .transactionType[0].resource[0].$;
                                days = resource.maxLeadTime / 86400000;
                            }
                        }
                    });
                    return days;
                });

            let maxTime = new Date(this.today);
            maxTime.setDate(maxTime.getDate() + days);
            let maxDate = new Date(maxTime).toISOString().split("T")[0];
            return maxDate;
        }
    },
    methods: {
        isNumber: function (event) {
            let keyCode = (event.keyCode ? event.keyCode : event.which);
            if (keyCode < 48 || keyCode > 57) {
                event.preventDefault();
            }
        },
        updateConsumer: function () {
            let config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-WSSID-Authorization": this.wssid
                }
            };

            let data = {
                firstName: this.firstName,
                lastName: this.lastName,
                phone: this.consumerPhone
            };
            axios
                .post(
                    `http://localhost:3000/qless/api/v1/kiosk/consumer`,
                    qs.stringify(data),
                    config
                )
                .then(function (response) {
                    console.log(response);
                });
        },
        makeAppointment: function () {
            this.errorCheck();
            if (this.errors.length > 0) {
                return;
            }
            this.updateConsumer();
            let config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-WSSID-Authorization": this.wssid
                }
            };

            let data = {
                phone: this.consumerPhone,
                queueId: this.selectedQueue.id,
                transactionTypeId: this.selectedTransactionType,
                start: this.selectedTime,
                remote: true,
                timeZone: "America/Los_Angeles"
            };

            axios
                .post(
                    `http://localhost:3000/qless/api/v1/appointment/queue/${this.selectedQueue.id}/appointment`,
                    qs.stringify(data),
                    config
                )
                .then(function (response) {
                    let successMessage = "";
                    let xml = response.data;
                    let error = "";
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            if (results && results.error) {
                                if (results.error.$.rootCauseType === 'AppointmentAlreadyScheduledException') {
                                    error = "You already have an appointment scheduled at this location!"
                                }
                            } else if (results.appointment) {
                                let time = results.appointment.$.start;
                                let appTime = time
                                    .split("T")[1]
                                    .split("-")[0]
                                    .slice(0, -3);
                                let day = time.split("T")[0];
                                successMessage = `You have successfully made an appointment for ${day} at ${appTime}`;
                            }
                        }
                    });
                    if (error) {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: error,
                            confirmButtonText: "Oh No!",
                            confirmButtonColor: "#02a8a8"
                        });
                    } else {
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: successMessage,
                            confirmButtonText: "Thanks!",
                            confirmButtonColor: "#02a8a8"
                        });
                    }

                });
            this.firstName = null;
            this.lastName = null;
            this.consumerPhone = null;
            this.selectedDate = null;
            this.selectedTime = null;
            this.selectedQueue = "";
            this.selectedTransactionType = "";
        },
        errorCheck: function () {
            this.errors = [];
            if (
                this.consumerPhone.length < 10 ||
                this.consumerPhone.match(/[a-z]/i) ||
                this.consumerPhone.match(/[/\s]/g)
            ) {
                this.errors.push({
                    errorCode: 0,
                    description: "Please enter a valid phone number"
                });
            }
        },
        joinQueue: function () {
            this.errorCheck();
            if (this.errors.length > 0) {
                return;
            }
            let config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-WSSID-Authorization": this.wssid
                }
            };

            let data = {
                firstName: this.firstName,
                lastName: this.lastName,
                phone: this.consumerPhone,
                queues: this.selectedQueue.id,
                transactionType: this.selectedTransactionType
            };

            let error = "";
            axios
                .post(
                    "http://localhost:3000/qless/api/v1/kiosk/enterQueue",
                    qs.stringify(data),
                    config
                )
                .then(function (response) {
                    let xml = response.data;
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            if (results) {
                                if (
                                    results.error &&
                                    results.error.$.rootCauseType === "AlreadyQueuedException"
                                ) {
                                    error = "You are already in line!";
                                }
                                if (
                                    results.error &&
                                    results.error.$.rootCauseType ===
                                    "TooManyQueuesEnteredException"
                                ) {
                                    error = "You are in the maximum number of queues!"
                                }
                                if (
                                    results.error &&
                                    results.error.$.rootCauseType === "Phone$IllegalPhoneNumber"
                                ) {
                                    error = "Please enter a valid Phone number!"
                                }
                            }
                        }
                    });
                    if (error) {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: error,
                            confirmButtonText: "Ok!",
                            confirmButtonColor: "#02a8a8"
                        });
                    } else {
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: "You have joined the line!",
                            confirmButtonText: "Nice!",
                            confirmButtonColor: "#02a8a8"
                        });
                    }
                });
            this.firstName = null;
            this.lastName = null;
            this.consumerPhone = null;
            this.selectedQueue = "";
            this.selectedTransactionType = "";
        },
        getPossibleBlocks: async function () {
            this.selectedTime = null;
            let blocks = [];
            let config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-WSSID-Authorization": this.wssid
                }
            };

            let data = {
                maxDays: 1,
                remote: true,
                start: this.selectedDate,
                timeZone: "America/Los_Angeles",
                transactionTypeIds: this.selectedTransactionType,
                wssid: this.wssid
            };

            await axios
                .post(
                    `http://localhost:3000/qless/api/v1/appointment/queue/${this.selectedQueue.id}/possibleBlocks`,
                    qs.stringify(data),
                    config
                )
                .then(function (response) {
                    let xml = response.data;
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            results.timeBlocks.timeBlock.forEach(tb => {
                                let date = tb.$.start;
                                blocks.push(date);
                            });
                        }
                    });
                });

            let standardBlocks = [];

            await blocks.forEach(block => {
                let milTime = block
                    .split("T")[1]
                    .split("-")[0]
                    .slice(0, -3)
                    .split(":");
                let hours = Number(milTime[0]);
                let minutes = Number(milTime[1]);

                var timeValue;

                if (hours > 0 && hours <= 12) {
                    timeValue = "" + hours;
                } else if (hours > 12) {
                    timeValue = "" + (hours - 12);
                } else if (hours == 0) {
                    timeValue = "12";
                }

                timeValue += minutes < 10 ? ":0" + minutes : ":" + minutes; // get minutes
                timeValue += hours >= 12 ? " P.M." : " A.M."; // get AM/PM

                standardBlocks.push({
                    serverFormat: block,
                    standardFormat: timeValue
                });
            });

            this.appointmentBlocks = standardBlocks;
            if (this.standardBlocks && this.appointmentBlocks.length > 0) {
                let serverDate = this.appointmentBlocks[0].split("T")[0];
                if (
                    serverDate !== this.selectedDate ||
                    this.appointmentBlocks.length < 1
                ) {
                    this.appointmentBlocks = null;
                }
            }
        },
        selectBlock: function (item, e) {
            let blocks = document.querySelectorAll(".block-selected");
            blocks.forEach(block => {
                block.classList.remove("block-selected");
            });
            this.selectedTime = item.serverFormat;
            if (e.target.className === "block-selected") {
                e.target.classList.remove("block-selected");
            } else {
                e.target.classList.add("block-selected");
            }
        },
        getTransactionTypes: async function () {
            this.selectedTransactionType = null;
            this.isAppointment = "";
            let transactionTypes = [];
            axios
                .get(
                    `http://localhost:3000/qless/api/v1/kiosk/queues/${this.selectedQueue.id}/transactionTypes`
                )
                .then(function (response) {
                    let xml = response.data;
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            if (results) {
                                if (results.transactionTypes === "") {
                                    return;
                                }
                                results.transactionTypes.transactionType.forEach(ttItem => {
                                    let transactionTypeObject = {
                                        ...ttItem.$
                                    };
                                    transactionTypeObject.description = ttItem.description[0];
                                    transactionTypes.push(transactionTypeObject);
                                });
                            }
                        }
                    });
                });
            this.transactionTypes = transactionTypes;
        }
    },
    mounted: async function () {
        this.locationId = this.$route.params.locationId;
        if (!this.locationId) {
            return;
        }
        let queues = [];
        let queueWaitTimes = [];
        let customScreens = [];
        let wssid = await axios
            .get("http://localhost:3000/qless/api/v1/wssid")
            .then(function (response) {
                const xml = response.data;
                let data = "";
                parseString(xml, function (err, results) {
                    if (err) {
                        console.log("could not parse XML");
                    } else {
                        data = results.wssid;
                    }
                });
                return data;
            });
        this.wssid = wssid;

        await axios.get(`http://localhost:3000/qless/api/v1/kiosk/location/${this.locationId}/customScreens`)
            .then(function (response) {
                let xml = response.data;
                parseString(xml, function (err, results) {
                    if (err) {
                        console.log('could not parse XML');
                    } else {
                        if (results.customKioskScreens.screen) {
                            results.customKioskScreens.screen.forEach(screen => {
                                console.log(screen);
                                customScreens.push(screen);
                            })
                        }
                    }
                });
            });
        this.customScreens = customScreens;

        await axios
            .get(
                `http://localhost:3000/qless/api/v1/kiosk/location/${this.locationId}/queues`
            )
            .then(function (response) {
                let xml = response.data;

                parseString(xml, function (err, results) {
                    if (err) {
                        console.log("could not parse XML");
                    } else {
                        if (results.queues) {
                            results.queues.queue.forEach(q => {
                                if (q.$.state === "ACTIVE") {
                                    let queueObject = {
                                        ...q.$
                                    };
                                    if (q && q.kioskInfo) {
                                        queueObject.kioskInfo = q.kioskInfo[0];
                                    }
                                    queueObject.description = q.description[0];
                                    queues.push(queueObject);
                                }
                            });
                        }
                    }
                });
            });
        this.queues = queues;

        let queueList = [];
        queues.forEach(function (q) {
            queueList.push(q.id);
        });

        if (this.queues.length > 0) {
            await axios
                .get(
                    `http://localhost:3000/qless/api/v1/kiosk/queues/${queueList.toString()}/waitInfo`
                )
                .then(function (response) {
                    const xml = response.data;
                    parseString(xml, function (err, results) {
                        if (err) {
                            console.log("could not parse XML");
                        } else {
                            results.waitInfos.waitInfo.forEach(q => {

                                if (q) {
                                    let queueWait = q.forecastNextWaitTime[0].$;
                                    if (queueWait && queueWait.duration > 1) {
                                        queueWaitTimes.push({
                                            queueId: q.$.queueId,
                                            duration: queueWait.duration,
                                            units: queueWait.units
                                        });
                                    }
                                }
                            });
                        }
                    });
                });
            // This line combines the queue with the current wait time for the queue
            this.queues.forEach(function (queue) {
                let waitIndex = queueWaitTimes.findIndex(q => q.queueId === queue.id);
                queue.wait = queueWaitTimes[waitIndex];
            });
        }
    }
};
</script>

<style>
body {
    margin: 0;
}

#app {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: left;
    color: #2c3e50;
    padding-top: 2rem;
    padding-bottom: 2rem;
}

.consumerInfo {
    display: flex;
    flex-direction: column;
    text-align: left;
}

label {
    margin-bottom: 0.5rem;
    display: block;
}

input {
    height: 3rem;
    border: none;
    border-radius: 3px;
    margin-bottom: 2rem;
    padding-left: 1rem;
}

.container {
    margin-top: 3rem;
    width: 80vw;
    max-width: 650px;
    margin: auto;
    padding: 1.5rem;
    background-color: aliceblue;
    border-radius: 6px;
}

select {
    display: block;
    font-size: 16px;
    font-family: sans-serif;
    font-weight: 700;
    color: #444;
    line-height: 1.3;
    padding: 0.6em 1.4em 0.5em 0.8em;
    width: 100%;
    max-width: 100%;
    margin: 0;
    border: none;
    border-radius: 3px;
    height: 3rem;
    -moz-appearance: none;
    -webkit-appearance: none;
    appearance: none;
    background-color: #fff;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat, repeat;
    background-position: right 0.7em top 50%, 0 0;
    background-size: 0.65em auto, 100%;
    margin-bottom: 2rem;
}

hr {
    border: solid 1px #04a8a878;
    border-radius: 2px;
    width: 10%;
    margin-top: 2rem;
}

input {
    font-family: Arial, Helvetica, sans-serif;
}

.swal2-title,
.swal2-content {
    font-family: sans-serif;
}

.wait-info {
    text-align: center;
    font-weight: bold;
    font-size: 1.5rem;
}

button {
    height: 4rem;
    background-color: #02a8a8;
    width: 100%;
    color: #fafafa;
    font-size: 1.5rem;
    border: none;
    border-radius: 3px;
    font-weight: bolder;
}

.join-queue>button {
    margin-top: 1rem;
}

.appointment-blocks>p {
    text-align: center;
}

.appointment-blocks-list {
    display: grid;
    align-items: center;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
}

.appointment-blocks-list>button {
    width: auto;
    font-size: 1rem;
    margin: 0.4rem;
    background: none;
    color: #02a8a8;
    border: solid;
    padding: 0.8rem;
    transition: 0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) all;
    border-radius: 5px;
}

.block-selected {
    background: #02a8a8 !important;
    color: #fafafa !important;
    transform: scale(1.2);
    border-radius: 6px;
}

.branding {
    text-align: center;
}

.branding>img {
    height: 100px;
    margin: auto;
}

.branding>p {
    margin: 0;
}

.slide-fade-enter-active {
    transition: all 0.3s ease-in-out;
}

.slide-fade-leave-active {
    transition: all 0.3s ease-in-out;
}

.slide-fade-enter,
.slide-fade-leave-to {
    transform: translateY(10px);
    opacity: 0;
}

.error {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1rem;
    color: #f65c78;
    margin-left: 10px;
    font-weight: bold;
}

p.no-queues {
    text-align: center;
    display: block;
    background: #f67280;
    padding: 1rem;
    border-radius: 3px;
    color: white;
    font-weight: bold;
}

.error>span {
    margin-left: 10px;
}
</style>
