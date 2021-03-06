(function () {
    var engine = this;
    var dispatcher;

    var initialize = function initialize() {
        dispatcher = new MessageDispatcher();
    };

    Object.defineProperty(engine, 'recv', {
        enumerable: true,
        value: function recv() {
            var type, callback;
            if (arguments.length === 1) {
                type = '*';
                callback = arguments[0];
            } else {
                type = arguments[0];
                callback = arguments[1];
            }
            return dispatcher.registerCallback(type, callback);
        }
    });

    Object.defineProperty(engine, 'send', {
        enumerable: true,
        value: function send(payload, data) {
            var message = {
                type: 'send',
                payload: payload
            };
            engine._send(JSON.stringify(message), data || null);
        }
    });

    Object.defineProperty(engine, 'ptr', {
        enumerable: true,
        value: function ptr(str) {
            return new NativePointer(str);
        }
    });

    Object.defineProperty(engine, 'NULL', {
        enumerable: true,
        value: new NativePointer("0")
    });

    var Console = function () {
        this.log = function () {
            var message = {
                type: 'log',
                payload: Array.prototype.join.call(arguments, " ")
            };
            engine._send(JSON.stringify(message), null);
        };
    };
    Object.defineProperty(engine, 'console', {
        enumerable: true,
        value: new Console()
    });

    Object.defineProperty(Memory, 'dup', {
        enumerable: true,
        value: function (mem, size) {
            var result = Memory.alloc(size);
            Memory.copy(result, mem, size);
            return result;
        }
    });

    var MessageDispatcher = function () {
        var messages = [];
        var operations = {};

        var initialize = function initialize() {
            engine._setIncomingMessageCallback(handleMessage);
        };

        this.registerCallback = function registerCallback(type, callback) {
            var op = new MessageRecvOperation(callback);
            operations[type] = op[1];
            dispatchMessages();
            return op[0];
        };

        var handleMessage = function handleMessage(rawMessage) {
            messages.push(JSON.parse(rawMessage));
            dispatchMessages();
        };

        var dispatchMessages = function dispatchMessages() {
            messages.splice(0, messages.length).forEach(dispatch);
        };

        var dispatch = function dispatch(message) {
            var handlerType;
            if (operations.hasOwnProperty(message.type)) {
                handlerType = message.type;
            } else if (operations.hasOwnProperty('*')) {
                handlerType = '*';
            } else {
                messages.push(message);
                return;
            }
            var complete = operations[handlerType];
            delete operations[handlerType];
            complete(message);
        };

        initialize.call(this);
    };

    var MessageRecvOperation = function (callback) {
        var completed = false;

        this.wait = function wait() {
            while (!completed) {
                engine._waitForEvent();
            }
        };

        var complete = function complete(message) {
            callback(message);
            completed = true;
        };

        return [this, complete];
    };

    initialize.call(this);
}).call(this);
