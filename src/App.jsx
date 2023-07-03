import { useEffect, useRef, useState } from 'react';
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Socket from './Socket';
import useWebSocket from 'react-use-websocket';
import joinSound from "./assets/sounds/public_sound_standard_SocialNotify.mp3"
import captureSound from "./assets/sounds/public_sound_standard_Capture.mp3"
import moveSound from "./assets/sounds/public_sound_standard_Move.mp3"
import gameEndSound from './assets/sounds/public_sound_standard_GenericNotify.mp3'


export default function App() {
  const [game, setGame] = useState(new Chess());
  const chessboardRef = useRef(null);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});
  const [playerId, setPlayerId] = useState(localStorage.getItem("playerId"))

  const [gameEndCause, setGameEndCause] = useState('')
  const [gameId, setGameId] = useState(localStorage.getItem('gameId'));

  const [gameDetails, setGameDetails] = useState(null);
  const [alert, setAlert] = useState({
    color: null,
    message: null
  })

  const [colouredMove, setColouredMove] = useState({})

  const { sendMessage } = useWebSocket('wss://chess.krescentadventures.com', {
    retryOnError: true,
    shouldReconnect: () => true,
    onOpen: () => {
      console.log("connected");
      setAlert({ ...alert, message: `Connected`, color: "green" });
      setTimeout(() => {
        setAlert({
          color: null,
          message: null
        })
      }, 1000)

      let mess = JSON.stringify({ event: "get-game", data: { gameId: gameId } })
      sendMessage(mess)
    },
    onMessage: (ev) => {
      const eventData = JSON.parse(ev.data)
      const data = eventData.data

      switch (eventData.event) {
        case 'opponent-made-move': {

          game.move({
            from: data.from,
            to: data.to,
            promotion: data.promotion
          })

          setColouredMove({
            [data.to]: { background: "rgba(255, 255, 0, 0.4)" },
            [data.from]: { background: "rgba(255, 255, 0, 0.3)" }
          })

          validateGame(game)

          break;
        }
        case 'ping': {
          break;
        }
        case 'game-details': {

          if (data === null) {
            console.log("nothing");
            break
          }

          if (!data?.fen) {
            const chess = new Chess()
            game.clear()
            game.load(chess.fen())

            setGame(chess)
            setGameDetails(data)
          } else {
            console.log("initial", data);
            game.load(data.fen)
            validateGame(game)
            setGameDetails(data)
          }

          setGameId(data?.gameId)
          localStorage.setItem("gameId", data?.gameId)
          break;
        }
        case 'game-created': {
          setAlert({ ...alert, message: `New game created with ID ${gameId}`, color: "green" });
          setTimeout(() => {
            setAlert({
              color: null,
              message: null
            })
          }, 4000)
          playSound(joinSound)
          if (!data.fen) {
            const chess = new Chess()
            game.reset()
            game.clear()
            game.load(chess.fen())

            setGame(chess)
            setGameDetails(data)
          }

          setGameId(data.gameId)
          localStorage.setItem("gameId", data.gameId)
          break
        }

        case 'player-joined': {
          const { gameId, gameData } = data
          playSound(joinSound)
          setGameDetails(gameData)
          console.log(`Joined game with ID ${gameId}`);
          setAlert({ ...alert, message: `Joined game with ID ${gameId}`, color: "green" });
          setTimeout(() => {
            setAlert({
              color: null,
              message: null
            })
          }, 4000)

          game.load(gameData.fen)
          validateGame(game)
          setGameDetails(gameData)
          setGameId(gameId)
          localStorage.setItem("gameId", gameId)
          break
        }

        case 'join-game-failed': {
          setAlert({ ...alert, message: eventData.data, color: "red" });
          setTimeout(() => {
            setAlert({
              color: null,
              message: null
            })
          }, 3000)

          break
        }
        default:
          break;
      }
    },

    onClose: () => {
      setAlert({ ...alert, message: "Disconnected trying to reconnect ...", color: "red" });
      console.log('WebSocket connection closed');
    },

    onError: (event) => {
      console.log("error", event);
    }
  });



  useEffect(() => {
    if (gameId !== null) {
      let mess = JSON.stringify({ event: "get-game", data: { gameId: gameId } })
      sendMessage(mess)
      playSound(joinSound)
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function makeSound(move) {
    if (move.flags.includes('c')) {
      // Captured piece
      playSound(captureSound);
    } else if (move.flags.includes('e')) {
      // En passant capture
      playSound(captureSound);
    } else if (move.flags.includes('k')) {
      // Kingside castle
      playSound(moveSound);
    } else if (move.flags.includes('q')) {
      // Queenside castle
      playSound(moveSound);
    } else if (move.flags.includes('p')) {
      // Promoted to a new piece
      playSound(moveSound);
    } else {
      // Normal move
      playSound(moveSound);
    }

    if (game.isGameOver()) {
      playSound(gameEndSound);
    }
  }

  function playSound(soundFile) {
    const audio = new Audio(soundFile);
    audio.play()
  }


  function onDrop(sourceSquare, targetSquare, piece) {

    if (game.turn() !== getColor().charAt(0)) return false;
    console.log("game", game);
    setColouredMove({})
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    });

    if (move === null) return false;
    setColouredMove({
      [move.to]: { background: "rgba(255, 255, 0, 0.4)" },
      [move.from]: { background: "rgba(255, 255, 0, 0.3)" }
    })
    validateGame(game)
    setOptionSquares({});


    const moveData = {
      fen: game.fen(),
      move: move
    }

    makeMoveServer({ gameId, playerId, moveData, move })

    return true;
  }

  function makeMoveServer({ gameId, playerId, moveData, move }) {
    let message = JSON.stringify({ event: "make-move", data: { gameId, playerId, moveData } })
    sendMessage(message)
    console.log("sent", message);
    makeSound(move)
  }


  function getMoveOptions(square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
            game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }


  function onSquareClick(square) {

    setRightClickedSquares({});
    if (game.turn() !== getColor().charAt(0)) return false;
    setColouredMove({})
    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }


    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = game.moves({
        moveFrom,
        verbose: true,
      });

      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square
      );


      // not a valid move
      if (!foundMove) {
        // check if clicked on new piece
        const hasMoveOptions = getMoveOptions(square);
        // if new piece, setMoveFrom, otherwise clear moveFrom
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }

      // valid move
      setMoveTo(square);

      // if promotion move
      if (
        (foundMove.color === "w" &&
          foundMove.piece === "p" &&
          square[1] === "8") ||
        (foundMove.color === "b" &&
          foundMove.piece === "p" &&
          square[1] === "1")
      ) {
        setShowPromotionDialog(true);
        setMoveFrom(moveFrom)
        // setMoveTo(moveTo)
        return;
      }

      // is normal move
      const move = game.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      setColouredMove({
        [move.to]: { background: "rgba(255, 255, 0, 0.45)" },
        [move.from]: { background: "rgba(255, 255, 0, 0.4)" }
      })
      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        const hasMoveOptions = getMoveOptions(square);
        if (hasMoveOptions) setMoveFrom(square);
        return;
      }

      console.log(game.history());

      validateGame(game)

      const moveData = {
        fen: game.fen(),
        move: move
      }

      makeMoveServer({ gameId, playerId, moveData, move })


      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  }



  function onPromotionPieceSelect(piece) {
    if (game.turn() !== getColor().charAt(0)) return false;

    setColouredMove({})
    if (piece) {
      const move = game.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece.charAt(1).toLowerCase() ?? "q",
      });

      validateGame(game)

      const moveData = {
        fen: game.fen(),
        move: move
      }

      setColouredMove({
        [move.to]: { background: "rgba(255, 255, 0, 0.4)" },
        [move.from]: { background: "rgba(255, 255, 0, 0.3)" }
      })

      makeMoveServer({ gameId, playerId, moveData })
    }


    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    setOptionSquares({});

    return true;
  }


  function dragHandler(square) {
    setMoveTo(square)
  }


  function dragStartHandler(_, sourceSquare) {
    setMoveFrom(sourceSquare)
    setColouredMove({})
  }


  function validateGame(game) {
    const isCheck = game.inCheck();
    const isCheckmate = game.isCheckmate();
    const isStalemate = game.isStalemate();
    const isDraw = game.isDraw();
    const hasInsufficientMaterial = game.isInsufficientMaterial();
    const isGameOver = game.isGameOver()



    if (isCheck) {
      const turn = game.turn();
      const boardState = game.board();

      let kingPosition;

      if (turn === 'w') {
        kingPosition = boardState.flat().find(piece => piece?.type === 'k' && piece.color === 'w').square;

        const color = "rgba(255, 0, 0, 0.7)";
        setMoveSquares({
          ...moveSquares,
          [kingPosition]:
            moveSquares[kingPosition] &&
              moveSquares[kingPosition].backgroundColor === color
              ? undefined
              : { backgroundColor: color },
        });


      } else {
        kingPosition = boardState.flat().find(piece => piece?.type === 'k' && piece.color === 'b').square;
        const color = "rgba(255, 0, 0, 0.7)";
        setMoveSquares({
          ...moveSquares,
          [kingPosition]:
            moveSquares[kingPosition] &&
              moveSquares[kingPosition].backgroundColor === color
              ? undefined
              : { backgroundColor: color },
        });
      }

    }

    if (!isCheck) {
      setMoveSquares({})
    }

    if (isCheckmate) {
      const turn = game.turn();
      const boardState = game.board();

      let kingPosition;

      if (turn === 'w') {
        kingPosition = boardState.flat().find(piece => piece?.type === 'k' && piece.color === 'w').square;

        const color = "rgba(255, 0, 0, 0.7)";
        setMoveSquares({
          ...moveSquares,
          [kingPosition]:
            moveSquares[kingPosition] &&
              moveSquares[kingPosition].backgroundColor === color
              ? undefined
              : { backgroundColor: color },
        });


      } else {
        kingPosition = boardState.flat().find(piece => piece?.type === 'k' && piece.color === 'b').square;
        const color = "rgba(255, 0, 0, 0.7)";
        setMoveSquares({
          ...moveSquares,
          [kingPosition]:
            moveSquares[kingPosition] &&
              moveSquares[kingPosition].backgroundColor === color
              ? undefined
              : { backgroundColor: color },
        });
      }

    }

    if (isGameOver) {
      let cause = " "
      if (isCheckmate) {
        const turn = game.turn()
        if (turn == "w") {
          cause = "Black won the game"
        } else {
          cause = "White won the game"
        }

      } else if (isDraw) {
        cause = "Draw"
      } else if (isStalemate) {
        cause = "Game Ended Stalemate"
      } else if (hasInsufficientMaterial) {
        cause = "Game Ended Insufficient Material"
      }

      setGameEndCause(cause)
      window.my_modal_2.showModal()
    }


  }


  function getColor() {
    let color = gameDetails?.color
    if (playerId === gameDetails?.player1Id) {
      return color
    } else {
      const opponent = color === "white" ? "black" : "white"
      return opponent
    }
  }

  const boardColor = getColor()



  return (
    <div className='md:px-2 main'>
      <Socket
        gameId={gameId}
        setGameId={setGameId}
        socket={sendMessage}
        alert={alert}
        setAlert={setAlert}
      />


      {gameDetails &&
        <div className='max-w-3xl mx-auto mt-10 md:rounded floating-box md:mt-4'>
          <Chessboard
            id="PremovesEnabled"
            position={game.fen()}
            boardOrientation={boardColor}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            onPieceDragBegin={dragStartHandler}
            onDragOverSquare={dragHandler}
            onPromotionPieceSelect={onPromotionPieceSelect}
            customBoardStyle={{
              boxShadow: "0 2px 10px rgba(0,0,0,.5)",
            }}
            customSquareStyles={{
              ...moveSquares,
              ...optionSquares,
              ...rightClickedSquares,
              ...colouredMove
            }}

            promotionToSquare={moveTo}
            showPromotionDialog={showPromotionDialog}
            ref={chessboardRef}
          />

        </div>
      }

      {gameDetails &&
        <div className='max-w-3xl mx-auto mt-8 text-black'>
          <p className='ml-2 text-lg font-bold text-black'> {game?.turn() == "b" ? "Black's turn to move" : "White's turn to move"} </p>
        </div>
      }

      <dialog id="my_modal_2" className="border-2 border-green-200 modal">
        <form method="dialog" className="border border-green-300 modal-box">
          <h3 className="text-lg font-bold text-center text-black">Hello!</h3>
          <p className="py-4 text-black text-center font-semibold text-[2rem] lg:text-[4rem]">{gameEndCause}</p>
        </form>
        <form method="dialog" className="modal-backdrop">
          <button className='w-full mx-2 text-center text-black button'>Close Modal</button>
        </form>
      </dialog>
    </div>
  );
}