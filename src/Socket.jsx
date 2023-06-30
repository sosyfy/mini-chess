import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const apiUrl = 'https://chess.krescentadventures.com';

// const apiUrl = 'http://localhost:3000';

const MAX_RETRIES = 15;
let retryCount = 0;

function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters[randomIndex];
    }

    return randomString;
}


const Socket = ({ gameId, setGameId, setGameDetails }) => {
    const [color, setColor] = useState('white');
    const [userName, setUserName] = useState('');
    const [playerId, setPlayerId] = useState(localStorage.getItem("playerId"));
    const [alert, setAlert] = useState({
        color: null,
        message: null
    })
    // Connect to the socket.io server
    const socket = io(apiUrl, {
        withCredentials: true,
        extraHeaders: {
            "my-custom-header": "abcd"
        }
    });


    socket.on('connect_error', (error) => {
        console.error('An error occurred:', error);

        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log('Retrying...');
            retryCount++;
            socket.connect(); // Reconnect the socket
        } else {
            console.log('Max retry count reached. Stopping the connection.');
            socket.close(); // Close the socket connection
        }
    });


    useEffect(() => {
        if (!playerId) {
            // Generate playerId and store it in local storage
            const generatedPlayerId = generateRandomString();
            localStorage.setItem('playerId', generatedPlayerId);
            setPlayerId(generatedPlayerId)
        }

    }, [])
    // Function to handle form submission and create a new game
    const handleSubmit = (e) => {
        e.preventDefault();
        window.create.close()

        localStorage.setItem("userName", userName)

        socket.emit('create-game', { playerId: playerId, color: color });

        socket.on('game-created', ({ gameId }) => {
            setGameId(gameId);

            localStorage.setItem('gameId', gameId); // Store gameId in local storage for persistence

            setAlert({ ...alert, message: `New game created with ID ${gameId}`, color: "green" });
            setTimeout(() => {
                setAlert({
                    color: null,
                    message: null
                })
            }, 2000)

            // Add event listeners for real-time updates or moves here if needed

            socket.off('game-creation-failed'); // Remove error listener after successful game creation
        });


        socket.on("connect_error", (err) => {
            setAlert({ ...alert, message: err.message, color: "red" });
            setTimeout(() => {
                setAlert({
                    color: null,
                    message: null
                })
            }, 2000)

        });


        socket.on("disconnect", () => {
            setAlert({ ...alert, message: "You have disconnected refresh the page to get back", color: "red" });
            setTimeout(() => {
                setAlert({
                    color: null,
                    message: null
                })
            }, 2000)
        });

    };

    // Function to join an existing game
    const handleJoinGame = (e) => {
        e.preventDefault();
        window.join.close();
        socket.emit('join-game', { gameId: gameId, playerId: playerId });

        socket.on('player-joined', ({ gameId, playerId, gameData }) => {
            setGameId(gameId);
            setPlayerId(playerId);
            setGameDetails(gameData)

            localStorage.setItem('gameId', gameId); // Store gameId in local storage for persistence

            // console.log(`Joined game with ID ${gameId}`);
            setAlert({ ...alert, message: `Joined game with ID ${gameId}`, color: "green" });
            setTimeout(() => {
                setAlert({
                    color: null,
                    message: null
                })
            }, 2000)
            // Add event listeners for real-time updates or moves here if needed
            socket.off("join-game-failed"); // Remove error listener after successful join

        });

        socket.on("join-game-failed", (err) => {
            setAlert({ ...alert, message: err.message, color: "red" });
            setTimeout(() => {
                setAlert({
                    color: null,
                    message: null
                })
            }, 2000)
        });
    };



    return (
        <div className='w-full my-8 px-12 max-w-3xl mx-auto'>
            <div className="flex w-full justify-between">
                <button className="btn" onClick={() => window.create.showModal()}> Create New Game </button>
                <h2 className='px-4 py-3 bg-slate-700  font-bold rounded-lg text-center'> {gameId}</h2>
                <button className="btn" onClick={() => window.join.showModal()}>Join Game </button>
            </div>

            <dialog id="create" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="modal-box" onSubmit={handleSubmit}>
                    <h3 className="font-bold text-lg text-center">Hello!</h3>
                    <div className='grid gap-2'>
                        <label htmlFor="name" className=''>Your name</label>
                        <input type="text" id='name' onChange={e => setUserName(e.target.value)} required placeholder="Enter your game name" className="input input-bordered input-accent w-full" />
                    </div>
                    <div className='grid gap-2 mt-4'>
                        <label htmlFor="name" className=''>Color to play as</label>
                        <select className="select select-accent w-full" onChange={e => setColor(e.target.value)}>
                            <option disabled defaultValue={"white"}>Black or White pieces?</option>
                            <option value={"white"}>White</option>
                            <option value={"black"}>Black</option>
                        </select>
                    </div>
                    <div className="modal-action">
                        {/* if there is a button in form, it will close the modal */}
                        <button type="submit" className="btn">Create</button>
                        <button className="btn" type='button' onClick={() => window.create.close()}>Close</button>
                    </div>
                </form>
            </dialog>

            <dialog id="join" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="modal-box" onSubmit={handleJoinGame}>
                    <h3 className="font-bold text-lg text-center">Join a game </h3>
                    <div className='grid gap-2'>
                        <label htmlFor="name" className=''>Game Id</label>
                        <input type="text" id='name' onChange={e => setGameId(e.target.value)} required placeholder="Enter game ID" className="input input-bordered input-accent w-full" />
                    </div>

                    <div className="modal-action">
                        {/* if there is a button in form, it will close the modal */}
                        <button type="submit" className="btn">Join</button>
                        <button className="btn" type='button' onClick={() => window.join.close()}>Close</button>
                    </div>
                </form>
            </dialog>

            {alert.message &&
                <div id="alert-border-3" className={`flex fixed bottom-0 right-8 left-8  p-4 mb-4 text-${alert.color}-800 border-t-4 border-${alert.color}-300 bg-${alert.color}-50 dark:text-${alert.color}-400 dark:bg-gray-800 dark:border-${alert.color}-800`} role="alert">
                    <svg className="flex-shrink-0 w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
                    <div className="ml-3 text-md font-medium">
                        {alert.message}
                    </div>
                    <button type="button" className="ml-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex h-8 w-8 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700" data-dismiss-target="#alert-border-3" aria-label="Close">
                        <span className="sr-only">Dismiss</span>
                        <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            }


        </div>
    )
}

export default Socket;
