const
    path = require('path'),
    url = require("url"),
    {shell, app, Menu, dialog, BrowserWindow, Tray, clipboard, ipcMain} = require('electron'),
    basePath = app.getAppPath(),
    config = require(path.join(basePath, "config.json")),
    pkg = require(path.join(basePath, "package.json")),
    storage = require("node-persist"),
    notifier = require('node-notifier'),
    momentHijri = require("moment-hijri"),
    AutoLaunch = require("auto-launch");

// some things which will be used in renderer process
global.storage = storage;
global.notifier = notifier;
global.icon = path.join(basePath, config.icon);

// setup squirrel event handler
if (handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function (command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (error) {
        }

        return spawnedProcess;
    };

    const spawnUpdate = function (args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            app.quit();
            return true;
    }
}

let windows = {}, tray, menu, willQuitApp = false, isVisible = false, autoLauncher = new AutoLaunch({
    name: config.productName
});


function init() {

    // google api key, required for geocoding
    process.env.GOOGLE_API_KEY = config.googleApiKey;

    //you must first call storage.initSync
    storage.initSync();

    if(!storage.getItemSync("notFirstRun")){
        // is first run
        autoLauncher.enable().then(()=>{
            // great!
            storage.setItemSync("notFirstRun", true);
        }).catch((e)=>{
            // unable to auto run
        });
    }

    windows.main = new BrowserWindow({
        width: 620,
        height: 580,
        icon: path.join(basePath, config.icon),
        show: false,
        center: true,
        resizable: false,
        maximizable: false,
        //minimizable: false,
        webPreferences: {
            backgroundThrottling: false
        }
    });

    function toggleWindow(forceVisibility){
        if((isVisible && forceVisibility !== true) || forceVisibility === false) {
            windows.main.hide();
            isVisible = false;
        }
        else {
            windows.main.show();
            isVisible = true;
        }
    }

    global.toggleWindow = toggleWindow;

    tray = new Tray(path.join(basePath, config.icon));
    tray.setToolTip(config.productName);
    tray.on("click", toggleWindow);
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: "Show / Hide",
            click: toggleWindow
        },
        {
            label: 'Exit',
            click(){
                app.quit();
            }
        }
    ]));

    // set menu
    let menuItems;
    menuItems = [
        {
            label: 'File',
            submenu: [
                {
                    label: "Hide",
                    click: toggleWindow
                },
                {
                    label: "Auto start",
                    type: "checkbox",
                    click(menuItem){
                        menuItems[0].submenu[1].checked = !menuItems[0].submenu[1].checked;
                        if(menuItem.checked){
                            autoLauncher.enable();
                        } else {
                            autoLauncher.disable();
                        }
                        menu = Menu.setApplicationMenu(Menu.buildFromTemplate( menuItems ));
                    }
                },
                {
                    type: 'separator'
                },
                {
                    role: 'quit'
                }
            ]
        }, {
            role: 'help',
            submenu: [
                {
                    label: 'About',
                    click () {
                        let btnClicked = dialog.showMessageBox(windows.main, {
                            type: "info",
                            title: "About",
                            buttons: [
                                "OK",
                                "Github",
                                "Website"
                            ],
                            message: config.productName + " " + pkg.version,
                            detail: pkg.description + "\n\n" +
                            "An open-source program created by Usama Ejaz" + "\n"
                        });
                        if (btnClicked === 1) {
                            shell.openExternal(config.github);
                        } else if (btnClicked === 2) {
                            shell.openExternal(config.homepage);
                        }
                    }
                }
            ]
        }
    ];
    autoLauncher.isEnabled().then((enabled)=>{
        menuItems[0].submenu[1].checked = enabled;
        menu = Menu.setApplicationMenu(Menu.buildFromTemplate( menuItems ));
    });

    function createWindow() {

        // Emitted when the window is closed.
        windows.main.on('closed', function () {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            delete windows.main;
            app.quit();
        });

        windows.main.on('close', (e) => {
            if (willQuitApp) {
                /* the user tried to quit the app */
                delete windows.main;
            } else {
                /* the user only tried to close the window */
                e.preventDefault();
                windows.main.hide();
                isVisible = false;
            }
        });

        windows.main.on('ready-to-show', function () {
            windows.main.show();
            isVisible = true;
        });

        windows.main.loadURL(url.format({
            pathname: path.join(basePath, 'src/view/main.html'),
            protocol: 'file:',
            slashes: true
        }));

    }

    return createWindow();

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', init);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windows.main === null) {
        init();
    } else {
        windows.main.show();
        isVisible = true;
    }
});

/* 'before-quit' is emitted when Electron receives
 * the signal to exit and wants to start closing windows */
app.on('before-quit', () => willQuitApp = true);