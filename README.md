# Prayer Times
A simple and easy to use electron based application to help you remind about prayer times.

> "And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive"  (2:45 - Quran)

### Some highlights
- Tries to predict prayer timings for your location on first launch, you can change timings.
- Dynamic notification / reminding **Rules** which you can setup.
    - Rules can trigger "notification", show "popup dialog" or execute an "external program or a command".
    - Set to execute a rule "x" minutes before prayer time. 
- Can remind you about upcoming prayers and their times.
- Increases productivity by making you aware and reminding you to take a break and pray :)

### Running
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

### Packaging / Redistributing
To package this app (for distribution)
```
npm run package
```
or to create installer
```
npm run setup
```
*Note that the above commands are for windows (64bit) only. Feel free to look into package.json `scripts` to extend it for your OS*

### Technology used

- This application is based on [Electron](https://github.com/electron/electron). 
- The frontend interface uses [VueJS](https://github.com/vuejs/vue).
- ...

### Contribute
Contributions are welcomed :)

##### Some links
[glaxosoft.com](http://glaxosoft.com)

[usamaejaz.com](http://usamaejaz.com)