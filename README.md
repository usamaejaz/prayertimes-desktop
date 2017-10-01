# Prayer Times
A simple and easy to use electron based application to help you remind about prayer times.

> "And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive"  (2:45 - Quran)

### Some Highlights
- Tries to predict prayer timings for your location on first launch, you can change timings.
- Dynamic notification / reminding **Rules** which you can setup.
    - Rules can trigger "notification", show "popup dialog" or execute an "external program or a command".
    - Set to execute a rule "x" minutes before prayer time. 
- Can remind you about upcoming prayers and their times.
- Increases productivity by making you aware and reminding you to take a break and pray :)


### Download
Go to [Releases](https://github.com/usamaejaz/prayertimes-desktop/releases) to download a ready to use packaged version of this app for your OS / Platform.

### Development
You will need NodeJS to build / run this app. Clone this repository and than install project dependencies.
```
git clone git@github.com:usamaejaz/prayertimes-desktop.git
cd prayertimes-desktop
npm install
```

Now you are ready to run it!
```
npm start
```

*Make sure you don't enable auto start while development mode (when using `npm start`) as it may add electron binary to the auto start which is not what was required. However, it will work good for the "packaged" version.*

### Packaging / Redistributing
To package this app (for distribution)
```
npm run package
```
*Note that the above command will package the app for all platforms / OS*

### Technology Used

- This application is based on [Electron](https://github.com/electron/electron). 
- The frontend interface uses [VueJS](https://github.com/vuejs/vue).

### Contribute
Contributions are welcomed :)

##### Some links
[glaxosoft.com](http://glaxosoft.com)

[usamaejaz.com](http://usamaejaz.com)
