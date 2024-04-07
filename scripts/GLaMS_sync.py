import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

connected = set()
rooms = {}

async def handle_ping(websocket):
    try:
        await websocket.ping()
        await asyncio.wait_for(websocket.pong(), timeout=10)
    except Exception as inst:
        logging.warning(f"Client didn't respond to PING. Closing connection. Reason: {inst}")
        await websocket.close()
        for room in rooms:
            rooms[room].remove(websocket)
        connected.remove(websocket)

async def periodic_ping():
    while True:
        await asyncio.sleep(60) 
        for ws in list(connected): 
            try:
                asyncio.ensure_future(handle_ping(ws))  # Use ensure_future
            except Exception as inst:
                logging.error(f"Error during periodic ping: {inst}")

async def echo(websocket, path):
    # Register
    connected.add(websocket)
    # Try to get the real IP from the 'X-Forwarded-For' header, or fall back to the socket's address
    forwarded_for = websocket.request_headers.get('X-Forwarded-For')
    if forwarded_for:
        ip = forwarded_for.split(',')[0].strip()  # Take the first IP from the list if there are multiple
        port = 0
    else:
        ip, port = websocket.remote_address
    logging.info(f"New user connected from {ip}. Total users: {len(connected)}")
    user_room = ""
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get("action")
                room = data.get("room")

                if action == "hello":
                    await websocket.send(json.dumps({"type": "status", "message": "hello"}))

                elif action == "join":
                    if room not in rooms:
                        rooms[room] = set()
                        logging.info(f"Room created: {room}. Total rooms: {len(rooms)}")
                    # remove from old room if needed
                    if user_room in rooms and websocket in rooms[user_room]:
                        rooms[user_room].remove(websocket)
                    rooms[room].add(websocket)
                    user_room = room
                    logging.info(f"{ip} added to room {room}.")
                    await websocket.send(json.dumps({"type": "status", "message": "joined"}))

                elif action == "leave":
                    if user_room in rooms and websocket in rooms[user_room]:
                        rooms[user_room].remove(websocket)
                        if len(rooms[user_room]) == 0:
                            logging.info(f"Room deleted: {user_room}")
                            del rooms[user_room]
                    user_room = ""
                    await websocket.send(json.dumps({"type": "status", "message": "left"}))

                elif action == "pull":
                    if user_room in rooms:
                        for client in rooms[user_room]:
                            if client != websocket:  # Avoid sending back to the sender.
                                await client.send(json.dumps({"type": "status", "message": "pull"}))
                    await websocket.send(json.dumps({"type": "status", "message": "sent"}))

                elif action == "message":
                    # Extract any other parameters, ignoring 'action' and 'room'.
                    additional_parameters = {k: v for k, v in data.items() if k not in ['action', 'room']}
                    formatted_message = json.dumps({
                        "type": "message",
                        **additional_parameters  # Merging any other parameters to the formatted_message
                    })
                    if room in rooms:
                        for client in rooms[room]:
                            if client != websocket:  # Avoid sending back to the sender.
                                await client.send(formatted_message)
                    await websocket.send(json.dumps({"type": "status", "message": "sent"}))

                else:
                    await websocket.send(json.dumps({"type": "status", "message": "invalid"}))
                
            except json.JSONDecodeError:
                logging.error(f"Received invalid message: {message}")
                await websocket.send(json.dumps({"type": "status", "message": "error"}))

    except websockets.exceptions.ConnectionClosedError:
        logging.warning("Connection closed unexpectedly.")

    finally:
        # Unregister
        if user_room in rooms and websocket in rooms[user_room]:
            rooms[user_room].remove(websocket)
            if len(rooms[user_room]) == 0:
                logging.info(f"Room deleted: {user_room}")
                del rooms[user_room]
        user_room = ""
        connected.remove(websocket)
        logging.info(f"User from {ip} disconnected. Total users: {len(connected)}")

start_server = websockets.serve(echo, "0.0.0.0", 8765)
logging.info("Server started.")

asyncio.get_event_loop().create_task(periodic_ping())
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
