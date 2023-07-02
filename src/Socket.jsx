import React, { useEffect, useState } from 'react';

function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters[randomIndex];
    }

    return randomString;
}

const Socket = ({ gameId, setGameId, socket, alert }) => {
    const [color, setColor] = useState('white');
    const [userName, setUserName] = useState('');
    const [playerId, setPlayerId] = useState(localStorage.getItem("playerId"))
    useEffect(() => {
        if (!playerId) {
            const generatedPlayerId = generateRandomString();
            localStorage.setItem('playerId', generatedPlayerId);
            setPlayerId(generatedPlayerId)
        }
    }, [playerId])

    //  create a new game
    const handleSubmit = (e) => {
        e.preventDefault();
        window.create.close()

        localStorage.setItem("userName", userName)
        let message = JSON.stringify({ event: 'create-game', data: { playerId: playerId, color: color } });
        socket(message)
    };

    // join an existing game
    const handleJoinGame = (e) => {
        e.preventDefault();
        window.join.close();

        let message = JSON.stringify({ event: 'join-game', data: { gameId: gameId, playerId: playerId } });
        socket(message)
    };



    return (
        <div className='w-full max-w-3xl px-2 mx-auto my-8 lg:px-12'>
            <div className="flex justify-between w-full">
                <button className="btn" onClick={() => window.create.showModal()}> Create New Game </button>
                <h2 className='px-4 py-3 font-bold text-center rounded-lg bg-slate-700'> {gameId}</h2>
                <button className="btn" onClick={() => window.join.showModal()}>Join Game </button>
            </div>

            <dialog id="create" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="modal-box" onSubmit={handleSubmit}>
                    <h3 className="text-lg font-bold text-center">Hello!</h3>
                    <div className='grid gap-2'>
                        <label htmlFor="name" className=''>Your name</label>
                        <input type="text" id='name' onChange={e => setUserName(e.target.value)} required placeholder="Enter your game name" className="w-full input input-bordered input-accent" />
                    </div>
                    <div className='grid gap-2 mt-4'>
                        <label htmlFor="name" className=''>Color to play as</label>
                        <select className="w-full select select-accent" onChange={e => setColor(e.target.value)}>
                            <option disabled defaultValue={"white"}>Black or White pieces?</option>
                            <option value={"white"}>White</option>
                            <option value={"black"}>Black</option>
                        </select>
                    </div>
                    <div className="modal-action">

                        <button type="submit" className="btn">Create</button>
                        <button className="btn" type='button' onClick={() => window.create.close()}>Close</button>
                    </div>
                </form>
            </dialog>

            <dialog id="join" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="modal-box" onSubmit={handleJoinGame}>
                    <h3 className="text-lg font-bold text-center">Join a game </h3>
                    <div className='grid gap-2'>
                        <label htmlFor="name" className=''>Game Id</label>
                        <input type="text" id='name' onChange={e => setGameId(e.target.value)} required placeholder="Enter game ID" className="w-full input input-bordered input-accent" />
                    </div>

                    <div className="modal-action">
                        <button type="submit" className="btn">Join</button>
                        <button className="btn" type='button' onClick={() => window.join.close()}>Close</button>
                    </div>
                </form>
            </dialog>

            {alert.message &&
                <div id="alert-border-3" className={`flex fixed bottom-0 right-8 left-8  p-4 mb-4 text-${alert.color}-800 border-t-4 border-${alert.color}-300 bg-${alert.color}-50 dark:text-${alert.color}-400 dark:bg-gray-800 dark:border-${alert.color}-800`} role="alert">
                    <svg className="flex-shrink-0 w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
                    <div className="ml-3 font-medium text-md">
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
