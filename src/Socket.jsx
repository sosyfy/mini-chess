import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const apiUrl = 'http://localhost:3000';

function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters[randomIndex];
    }

    return randomString;
}


const Socket = ({ gameId, setGameId }) => {
    const [color, setColor] = useState('white');
    const [userName, setUserName] = useState('');
    const [playerId, setPlayerId] = useState(localStorage.getItem("playerId"));

    // Connect to the socket.io server
    const socket = io(apiUrl, {
        withCredentials: true,
        extraHeaders: {
            "my-custom-header": "abcd"
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

            console.log(`New game created with ID ${gameId}`);

            // Add event listeners for real-time updates or moves here if needed

            socket.off('game-creation-failed'); // Remove error listener after successful game creation
        });


        socket.on("connect_error", (err) => {
            console.error(err.message);
        });
      

        socket.on("disconnect", () => {
            alert("You have been disconnected");
        });

    };

    // Function to join an existing game
    const handleJoinGame = (e) => {
        e.preventDefault();
        window.join.close();
        socket.emit('join-game', { gameId: gameId, playerId: playerId });

        socket.on('player-joined', ({ gameId, playerId }) => {
            setGameId(gameId);
            setPlayerId(playerId);

            localStorage.setItem('gameId', gameId); // Store gameId in local storage for persistence

            console.log(`Joined game with ID ${gameId}`);

            // Add event listeners for real-time updates or moves here if needed
            socket.off("join-game-failed"); // Remove error listener after successful join

        });

        socket.on("join-game-failed", (err) => {
            console.error(err);
        });
    };



    return (
        <div className='w-full my-8 px-12'>
            <div className="flex w-full justify-between">
                <button className="btn" onClick={() => window.create.showModal()}> Create New Game </button>
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
                        <button className="btn" type='button' onClick={()=> window.create.close()}>Close</button>
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
                        <button className="btn" type='button' onClick={()=> window.join.close()}>Close</button>
                    </div>
                </form>
            </dialog>
        </div>
    )
}

export default Socket;
