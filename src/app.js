const
    config = require("../config.json"),
    pkg = require("../package.json"),
    moment = require("moment"),
    momentHijri = require("moment-hijri"),
    Vue = require("vue/dist/vue.common"),
    Vue2Filters = require('vue2-filters'),
    VTooltip = require("v-tooltip"),
    Sortable = require("sortablejs"),
    prayTimes = require("../src/PrayTimes"),
    $ = jQuery = window.$ = window.jQuery = require("jquery"),
    {remote, shell} = require("electron"),
    storage = remote.getGlobal("storage"),
    notifier = remote.getGlobal("notifier"),
    exec = require('child_process').exec;

document.title = pkg.productName;

Vue.use(Vue2Filters);
Vue.use(VTooltip, {
    defaultContainer: "#tooltips"
});
Vue.directive('sortable', {
    inserted: function (el, binding, vnode) {
        let options = binding.value || {};
        options.onStart = ()=>{
            vnode.context.hideTooltips = true;
        };
        options.onEnd = ()=>{
            vnode.context.hideTooltips = false;
        };
        let sortable = new Sortable(el, options);
    }
});
momentHijri.locale("en");

let rulesRecord = {};

let app = new Vue({
    el: '#app',
    data: {
        position: {
            latitude: 31.5546060,
            longitude: 74.3571580
        },
        settings: {
            position: {
                latitude: NaN,
                longitude: NaN
            },
            method: "Karachi",
            timezone: "auto", // or -5, 5 etc
            dst: "auto", // 1, 0, auto
            format: "12h",
            customTimes: {},
            rules: [
                {
                    type: "notify",
                    beforeMins: 30, //mins
                    message: "get ready!"
                },
                {
                    type: "notify",
                    beforeMins: 15 //mins
                },
                {
                    type: "notify",
                    beforeMins: 7 //mins
                }
            ]
        },
        times: {},
        prayer: {},
        prayerNames: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
        hijriDate: "",
        activeTab: "home",
        initialized: false,
        hideTooltips: false,
        config: config
    },
    methods: {
        openLink(url){
            shell.openExternal(url);
        },
        saveSettings(){
            storage.setItem('settings', this.settings);
        },
        getTimes () {

            let coords = this.position;

            let calculatedTimes = prayTimes.getTimes(new Date(), [coords.latitude, coords.longitude], this.settings.timezone, this.settings.dst, this.settings.format);

            return $.extend({}, calculatedTimes, this.settings.customTimes);
        },
        setTime (e) {
            let $input = $(e.target);
            let prayer = $input.data("prayer");
            this.settings.customTimes[prayer] = moment('2000-01-01 00:00:00').add(moment.duration(e.target.valueAsNumber)).format('h:mm a');
            this.times[prayer] = this.settings.customTimes[prayer];
            this.saveSettings();
        },
        inputTime (prayer) {
            let d = moment(this.times[prayer], "h:mm a").toDate(),
                h = d.getHours(),
                m = d.getMinutes();
            if (h < 10) h = '0' + h;
            if (m < 10) m = '0' + m;
            return h + ':' + m;
        },
        showTab (tab) {
            app.activeTab = tab;
        },
        readableTime(seconds) {
            let total_minutes = seconds / 60;

            //set proper time for activity logging
            let hours = Math.floor(seconds / 3600);
            let mins = Math.floor((seconds - (hours * 3600)) / 60);
            let secs = Math.floor(seconds % 60);

            let ret = "";
            if (hours > 0)
                ret += hours + "h ";

            if (mins > 0)
                ret += mins + "m ";

            if (secs > 0)
                ret += secs + "s";

            return ret.trim();

        },
        getPrayer() {
            // find the upcoming / current prayer
            let
                currentMoment = moment(),
                currentDate = currentMoment.toDate(),
                _prayer = {};

            for (let prayer in this.times) {
                if (this.times.hasOwnProperty(prayer) && this.prayerNames.indexOf(prayer) > -1) {

                    let prayerMoment = moment(this.times[prayer], "h:mm a");

                    let _date = prayerMoment.toDate();

                    if ((!_prayer._date || (_prayer._date && _prayer._date.getTime() > _date.getTime())) && currentDate.getTime() <= _date.getTime()) {
                        _prayer = {
                            name: prayer,
                            time: this.times[prayer],
                            _date: _date,
                            _moment: prayerMoment
                        };
                    }

                }
            }

            if (!_prayer._date) {
                // all done for today, select fajr for the next day
                let prayerMoment = moment(this.times.fajr, "h:mm a").add(1, "days");
                let _date = prayerMoment.toDate();
                _prayer = {
                    name: "fajr",
                    time: this.times.fajr,
                    _date: _date,
                    _moment: prayerMoment
                };
            }

            let currentUnix = Math.round(currentDate.getTime() / 1000);

            let prayerUnix = Math.round(_prayer._date.getTime() / 1000);

            _prayer.timeRemaining = this.readableTime(prayerUnix - currentUnix);

            return _prayer;
        },
        // Rules
        addRule() {
            this.settings.rules.unshift({
                type: "notify",
                beforeMins: 15,
                message: "",
                command: ""
            });
            rulesRecord = {};
            this.saveSettings();
        },
        deleteRule(index) {
            this.settings.rules.splice(index, 1);
            rulesRecord = {};
            this.saveSettings();
        },
        reorderRules({oldIndex, newIndex}) {
            let clonedRules = this.settings.rules.filter(function(item){
                return item;
            });
            const movedItem = clonedRules.splice(oldIndex, 1)[0];
            clonedRules.splice(newIndex, 0, movedItem);
            rulesRecord = {};
            this.settings.rules = [];
            this.$nextTick(()=>{
                this.settings.rules = clonedRules;
                this.saveSettings();
            });
        }
    }
});

// load saved settings from storage and override app.settings
let savedSettings = storage.getItemSync("settings");
if (savedSettings) {
    app.settings.customTimes = savedSettings.customTimes;
    app.settings.rules = savedSettings.rules;
    app.settings.position = savedSettings.position;
}

// set coordinates
if (!isNaN(app.settings.position.latitude) && !isNaN(app.settings.position.longitude)) {
    // use custom coordinates
    app.position.latitude = app.settings.position.latitude;
    app.position.longitude = app.settings.position.longitude;
    init();
} else {
    // try to autodetect
    navigator.geolocation.getCurrentPosition((pos) => {
        app.position.latitude = pos.coords.latitude;
        app.position.longitude = pos.coords.longitude;
        app.settings.position.latitude = pos.coords.latitude;
        app.settings.position.longitude = pos.coords.longitude;
        init();
    }, (err) => {
        console.log('Geolocation error: ', err);
        init();
    }, {enableHighAccuracy: true});
}

function init() {

    let showingMsgBox = false;

    let today = moment().format("YYYY-MM-DD");

    app.$nextTick(function () {

        // populate prayer timings
        app.times = app.getTimes();
        app.prayer = app.getPrayer();
        app.hijriDate = momentHijri().format('iD iMMMM iYYYY') + " AH";
        app.initialized = true;

        function heartBeat() {
            // countdown and notification

            app.prayer = app.getPrayer();

            document.title = pkg.productName + " - " + app.prayer.timeRemaining;

            let currentMoment = moment();

            if (currentMoment.format("YYYY-MM-DD") !== today) {
                // set today to current date
                today = currentMoment.format("YYYY-MM-DD");
                app.hijriDate = momentHijri().format('iD iMMMM iYYYY') + " AH";
                // reset rules history
                rulesRecord = {};
                console.log('reset rules record');
            }

            rulesRecord[app.prayer.name] = rulesRecord[app.prayer.name] || [];

            setTimeout(function () {
                //console.log("foreach");

                app.settings.rules.forEach(function (rule, i) {


                    if (rulesRecord[app.prayer.name].indexOf(i) === -1) {

                        let minutesRemaining = Math.round((Math.round(currentMoment.toDate().getTime() / 1000) - Math.round(app.prayer._date.getTime() / 1000)) / 60);

                        if (minutesRemaining * -1 === rule.beforeMins) {

                            if (rule.type === "notify") {
                                // notify

                                let noti = notifier.notify({
                                    title: app.prayer.name.toUpperCase(),
                                    message: rule.message || "at " + app.prayer.time,
                                    icon: remote.getGlobal("icon"), // Absolute path (doesn't work on balloons)
                                    sound: true, // Only Notification Center or Windows Toasters
                                    wait: true // Wait with callback, until user action is taken against notification
                                }, function (err, response) {
                                    // Response is response from notification
                                });

                                noti.on('click', function (notifierObject, options) {
                                    // Triggers if `wait: true` and user clicks notification
                                    console.log("click");
                                });

                                noti.on('timeout', function (notifierObject, options) {
                                    // Triggers if `wait: true` and notification closes
                                    console.log("timeout");
                                });


                            } else if (rule.type === "exec" && rule.command.length) {
                                // execute command
                                let ret = exec(rule.command, (err, stdout, stderr) => {
                                    if (err) {
                                        console.error(err);
                                        notifier.notify({
                                            'title': "Command error.",
                                            'message': err.message || "While executing: " + rule.command,
                                            icon: remote.getGlobal("icon"), // Absolute path (doesn't work on balloons)
                                            sound: true, // Only Notification Center or Windows Toasters
                                            wait: true // Wait with callback, until user action is taken against notification
                                        }, function (err, response) {
                                            // Response is response from notification
                                            //console.log(arguments);
                                        });
                                        return;
                                    }
                                    console.log(stdout);
                                });
                                console.log("Executed command", ret);
                            } else if (rule.type === "msgBox" && !showingMsgBox) {
                                // show app
                                remote.getGlobal("toggleWindow")(true);
                                // show msgbox
                                showingMsgBox = true;
                                remote.dialog.showMessageBox(remote.getCurrentWindow(), {
                                    type: "info",
                                    title: app.prayer.name.toUpperCase(),
                                    message: rule.message || "Get ready for " + app.prayer.name.toUpperCase() + " prayer at " + app.prayer.time,
                                    icon: remote.getGlobal("icon")
                                }, function(res){
                                    showingMsgBox = false;
                                });
                            }

                            rulesRecord[app.prayer.name].push(i);

                            console.log("rule executed", rule);

                        }

                        //console.log("Processed rule");

                    } else {
                        //console.log("Already executed rule with index", i);
                    }

                });
            }, 10);

            setTimeout(heartBeat, 1000);
        }

        heartBeat();
    });

    /*
    window.test = function () {
        let noti = notifier.notify({
            'title': app.prayer.name.toUpperCase(),
            'message': "at " + app.prayer.time,
            icon: remote.getGlobal("icon"), // Absolute path (doesn't work on balloons)
            sound: true, // Only Notification Center or Windows Toasters
            wait: true // Wait with callback, until user action is taken against notification
        }, function (err, response) {
            // Response is response from notification
            //console.log(arguments);
        });

        noti.on('click', function (notifierObject, options) {
            // Triggers if `wait: true` and user clicks notification
            console.log("click");
        });

        noti.on('timeout', function (notifierObject, options) {
            // Triggers if `wait: true` and notification closes
            console.log("timeout");
        });


    }
    */

}

window.app = app;