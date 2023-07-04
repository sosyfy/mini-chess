
import React, { useEffect, useState } from 'react';
import king from "./assets/king.png"
import cancel from "./assets/icons8-close.svg"

function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters[randomIndex];
    }

    return randomString;
}



const Socket = ({ gameId, setGameId, socket, alert, setAlert }) => {
    const [color, setColor] = useState('white');
    const [playerId, setPlayerId] = useState(localStorage.getItem("playerId"))
    const [joinId, setJoinId] = useState(null)


    useEffect(() => {
        if (!playerId) {
            const generatedPlayerId = generateRandomString();
            localStorage.setItem('playerId', generatedPlayerId);
            setPlayerId(generatedPlayerId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    const copyToClipboard = () => {
        navigator.clipboard.writeText(gameId)
            .then(() => {
                const message = 'Copied to clipboard: ' + gameId;
                setAlert({ ...alert, message: message, color: "green" });
                setTimeout(() => {
                    setAlert({
                        color: null,
                        message: null
                    })
                }, 1000);
            })

    };
   
    const handleSubmit = (e) => {
        e.preventDefault();
        window.create.close()
        setColor(null)
        let message = JSON.stringify({ event: 'create-game', data: { playerId: playerId, color: color } });
        socket(message)

        const radioButtons = document.getElementsByName('options');
        radioButtons.forEach(button => button.checked = false);

    };

  
    const handleJoinGame = (e) => {
        e.preventDefault();
        window.joinModal.close();
        setGameId(joinId)
        let message = JSON.stringify({ event: 'join-game', data: { gameId: joinId, playerId: playerId } });
        socket(message)
        setJoinId(null)
    };

    const handleCloseCreate = () => {
        setColor(null)
        const radioButtons = document.getElementsByName('options');
        radioButtons.forEach(button => button.checked = false);
        window.create.close()
    }

    const handleJoinClose = () => {
        setJoinId(null)
        window.joinModal.close()
    }

    return (
        <div className='w-full max-w-3xl px-2 mx-auto my-3 md:my-8 lg:px-12'>
            <div className="flex justify-between w-full">
                <button className="button" onClick={() => window.create.showModal()}> Create New Game </button>
                {gameId && (<h2 onClick={copyToClipboard} className='hidden sm:block button'> {gameId}</h2>)}
                <button className="button" onClick={() => window.joinModal.showModal()}>Join Game </button>
            </div>
            {gameId && (<center><h2 onClick={copyToClipboard} className='inline-block mx-auto mt-3 text-center sm:hidden button'> {gameId}</h2></center>)}

            <dialog id="create" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="relative modal-box" onSubmit={handleSubmit}>
                    <h3 className="text-2xl font-bold text-center text-black">Hello!</h3>
                    <p className='text-2xl text-center text-black'>Choose a color to play as </p>
                    <div className='flex justify-between p-0 m-0 mt-4'>
                        <input type="radio" id="option2" name="options" value="white" onChange={() => setColor("white")} required />
                        <label for="option2" className="p-2 md:p-5 bg-[#fbce90]/50 border-4 rounded-3xl radio-label">
                            <img src={king} alt="Option 2" className="radio-image filter invert grayscale-0 contrast-200" />
                        </label>
                        <input type="radio" id="option1" name="options" value="black" onChange={() => setColor("black")} required />
                        <label for="option1" className="p-2 md:p-5 bg-[#fbce90]/50 border-4 rounded-3xl radio-label">
                            <img src={king} alt="Option 2" className="radio-image" />
                        </label>
                    </div>

                    <p className='mt-4 text-lg bg-[#fbce90]/60 text-center text-black'>A game Id will be created at the top.Click to copy and send to a friend.First person to Join will play with You</p>

                    <div className="modal-action">
                        <button type='button' className='absolute top-3 right-3' onClick={() => handleCloseCreate()}><img className="h-10 md:h-12" src={cancel} /></button>
                        <button type="submit" disabled={color === null ? true : false} className="w-full text-center button">Create Game</button>
                    </div>
                </form>
            </dialog>

            <dialog id="joinModal" className="modal modal-middle sm:modal-middle">
                <form method="dialog" className="relative modal-box" onSubmit={handleJoinGame}>
                    <h3 className="text-2xl font-bold text-center text-black">Join a game </h3>
                    <div className='grid gap-2'>
                        <label className='text-black'>Game Id</label>
                        <input type="text" value={joinId} onChange={e => setJoinId(e.target.value)} required placeholder="Enter a valid game ID" className="w-full input bg-[#fbce90]/70 placeholder:text-black text-black border-2 border-white/60 focus:ring-0 focus:border-[#b16800]" />
                    </div>

                    <div className="modal-action">

                        <button type='button' className='absolute top-3 right-3' onClick={() => handleJoinClose()}><img className="h-10 md:h-12" src={cancel} /></button>
                        <button type="submit" disabled={joinId === null ? true : false} className="w-full text-center button">Join Game</button>
                    </div>
                </form>
            </dialog>

            {alert.message &&
                <div id="alert-border-3" className={`flex fixed bottom-0 right-2 left-2 md:right-8 md:left-8 z-10  p-2 mb-4 text-${alert.color}-800 border-t-4 border-${alert.color}-300 bg-${alert.color}-50 dark:text-${alert.color}-400 dark:bg-gray-800 dark:border-${alert.color}-800`} role="alert">
                    <svg className="flex-shrink-0 w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
                    <div className="ml-3 text-lg font-medium">
                        {alert.message}
                    </div>
                    { typeof alert.message === 'string' &&
                        <button type="button" className={`ml-auto -mx-1.5 -my-1.5 bg-${alert.color}-50 text-${alert.color}-500 rounded-lg focus:ring-2 focus:ring-${alert.color}-400 p-1.5 hover:bg-${alert.color}-200 inline-flex h-8 w-8 dark:bg-gray-800 dark:text-${alert.color}-400 dark:hover:bg-gray-700`} data-dismiss-target="#alert-border-3" aria-label="Close">
                            <span className="sr-only">Dismiss</span>
                            <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                        </button>
                    }
                </div>
            }


        </div>
    )
}

export default Socket;
