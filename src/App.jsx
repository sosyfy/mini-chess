import { useEffect, useRef, useState } from 'react';
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Socket from './Socket';
import useWebSocket from 'react-use-websocket';


export default function App() {

  const [game, setGame] = useState(new Chess());
  const chessboardRef = useRef(null);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [gameFen, setGameFen] = useState()
  const [optionSquares, setOptionSquares] = useState({});
  const [playerId] = useState(localStorage.getItem("playerId"))
  const [gameEndCause, setGameEndCause] = useState('')
  const [gameId, setGameId] = useState(localStorage.getItem("gameId"));
  const [isConnected, setIsConnected] = useState(false);
  const [gameDetails, setGameDetails] = useState(null);
  const [alert, setAlert] = useState({
    color: null,
    message: null
  })

  const { sendMessage } = useWebSocket('ws://localhost:3000', {
    onOpen: () => {
      console.log("connected");
      setTimeout(() => {
        setAlert({
          color: null,
          message: null
        })
      }, 2000)

      let mess = JSON.stringify({ event: "get-game", data: { gameId: gameId } })
      sendMessage(mess)
      
      setIsConnected(true)
    },
    onMessage: (ev) => {
      const eventData = JSON.parse(ev.data)
      const data = eventData.data
      console.log(eventData.event)

      switch (eventData.event) {
        case 'opponent-made-move': {
          const newGame = new Chess(data.fen)
          setGame(newGame)
          setGameFen(data.fen)
          validateGame(newGame)

          console.log(newGame.history());
          break;
        }
        case 'ping': {
          setIsConnected(true)
          break;
        }
        case 'game-details': {
          if (!data.fen) {
            console.log("sdfgf");
            const chess = new Chess()
            game.reset()
            game.clear()
            game.load(chess.fen())
            setGameFen(game.fen())
            setGame(chess)
            setGameDetails(data)
          } else {
            console.log("initial", data);
            const newGame = new Chess(data.fen)
            newGame.load(data.fen)
            setGameFen(data.fen)
            setGame(newGame)
            validateGame(newGame)
            setGameDetails(data)
          }

          setGameId(data.gameId)
          localStorage.setItem("gameId", data.gameId)
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
          if (!data.fen) {
            const chess = new Chess()
            game.reset()
            game.clear()
            game.load(chess.fen())
            setGameFen(game.fen())
            setGame(chess)
            setGameDetails(data)
          } else {
            const newGame = new Chess(data.fen)
            newGame.load(data.fen)
            setGameFen(data.fen)
            setGame(newGame)
            validateGame(newGame)
            setGameDetails(data)
          }

          setGameId(data.gameId)
          localStorage.setItem("gameId", data.gameId)
          break
        }

        case 'player-joined': {
          const { gameId, gameData } = data
          setGameDetails(gameData)
          console.log(`Joined game with ID ${gameId}`);
          setAlert({ ...alert, message: `Joined game with ID ${gameId}`, color: "green" });
          setTimeout(() => {
            setAlert({
              color: null,
              message: null
            })
          }, 4000)
          const newGame = new Chess(gameData.fen)
          newGame.load(gameData.fen)
          setGameFen(gameData.fen)
          setGame(newGame)
          validateGame(newGame)
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
      setIsConnected(false)
      setAlert({ ...alert, message: "You have disconnected refresh the page to get back", color: "red" });
      console.log('WebSocket connection closed');
    },

    onError: (event) => {
      setIsConnected(false)
      console.log("error", event);
    }
  });

 

  useEffect(() => {
    
    if (gameId !== null) {
      let mess = JSON.stringify({ event: "get-game", data: { gameId: gameId } })
      sendMessage(mess)
    }

  }, [gameId])


  function onDrop(sourceSquare, targetSquare, piece) {

    if (game.turn() !== getColor().charAt(0)) return false;

    const gameCopy = new Chess(game.fen());

    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    });

    if (move === null) return false;

    const newGame = new Chess(gameCopy.fen())
    setGame(newGame)
    setGameFen(newGame.fen())
    validateGame(game)
    setOptionSquares({});


    const moveData = {
      fen: gameCopy.fen(),
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    }

    makeMoveServer({ gameId, playerId, moveData })

    return true;
  }

  function makeMoveServer({ gameId, playerId, moveData }) {
    let message = JSON.stringify({ event: "make-move", data: { gameId, playerId, moveData } })
    sendMessage(message)
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
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        const hasMoveOptions = getMoveOptions(square);
        if (hasMoveOptions) setMoveFrom(square);
        return;
      }


      setGame(gameCopy)
      setGameFen(gameCopy.fen())
      validateGame(gameCopy)

      const moveData = {
        fen: gameCopy.fen(),
        from: moveFrom,
        to: moveTo,
        promotion: "q",
      }


      makeMoveServer({ gameId, playerId, moveData })


      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  }


  function onSquareRightClick(square) {
    // console.log(square , "SQUARE");

    const color = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
          rightClickedSquares[square].backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    });
  }


  function onPromotionPieceSelect(piece) {
    if (game.turn() !== getColor().charAt(0)) return false;

    const gameCopy = new Chess(game.fen()); // Use spread operator or any other method to create a copy of game object
    if (piece) {

      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece.charAt(1).toLowerCase() ?? "q",
      });

      const newGame = new Chess(gameCopy.fen())
      setGame(newGame)
      setGameFen(newGame.fen())
      validateGame(newGame)
    }

    const moveData = {
      fen: gameCopy.fen(),
      from: moveFrom,
      to: moveTo,
      promotion: piece[1]?.toLowerCase() ?? "q",
    }

    makeMoveServer({ gameId, playerId, moveData })

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
  }


  function validateGame(game) {
    // alert(game)
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
    <div>
      <Socket
        gameId={gameId}
        setGameId={setGameId}
        socket={sendMessage}
        alert={alert}
      />


      {gameDetails &&
        <div className='max-w-3xl mx-auto mt-32 md:mt-4'>
          <Chessboard
            id="PremovesEnabled"
            position={gameFen}
            boardOrientation={boardColor}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            onPieceDragBegin={dragStartHandler}
            onDragOverSquare={dragHandler}
            onPromotionPieceSelect={onPromotionPieceSelect}
            customBoardStyle={{
              borderRadius: "4px",
              boxShadow: "0 2px 10px rgba(0,0,0,.5)",
            }}
            customSquareStyles={{
              ...moveSquares,
              ...optionSquares,
              ...rightClickedSquares,
            }}

            promotionToSquare={moveTo}
            showPromotionDialog={showPromotionDialog}
            ref={chessboardRef}
          />

          <div className='mt-4'>
            <p className='font-sans font-bold text-md'> {game.turn() == "b" ? "Black's turn to move" : "White's turn to move"} </p>
          </div>
        </div>
      }

      <dialog id="my_modal_2" className="border-2 border-green-200 modal">
        <form method="dialog" className="border border-green-300 modal-box">
          <h3 className="text-lg font-bold text-center">Hello! <span className='text-green-400 uppercase'>{localStorage.getItem("userName")} </span></h3>
          <p className="py-4 text-center font-semibold text-[2rem] lg:text-[4rem]">{gameEndCause}</p>
        </form>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}