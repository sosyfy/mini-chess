import { useEffect, useRef, useState } from 'react';
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Socket from './Socket';
import io from 'socket.io-client';


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
  // Connect to the socket.io server
  const [gameDetails, setGameDetails] = useState(null)

  const apiUrl = 'http://localhost:3000';

  const socket = io(apiUrl, {
    withCredentials: true,
    extraHeaders: {
      "my-custom-header": "abcd"
    }
  });

  socket.on('opponent-made-move', ({ gameData, senderId, moveData }) => {

    socket.emit("get-game", { gameId: gameId })
  });

  useEffect(() => {

    if (gameId) {
      socket.emit("get-game", { gameId: gameId })

      socket.on("game-details", ({ data }) => {
        // console.log(data);
        // setGameId(data.gameId)
        setGameDetails(data)

        if (!data.fen) {
          const chess = new Chess()
          game.reset()
          game.clear()
          game.load(chess.fen())
          setGameFen(game.fen())
          setGame(chess)
        } else {
          console.log(data.fen, game.fen());

          game.load(data.fen)
          setGameFen(data.fen)
          validateGame(game)

        }

        localStorage.setItem("gameId", data.gameId)
      })
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

    // validateGame(gameCopy)
    setGame(gameCopy);

    const moveData = {
      fen: gameCopy.fen(),
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    }

    setTimeout(() => {
      makeMoveServer({ gameId, playerId, moveData })
    }, 1000)

    return true;
  }

  function makeMoveServer({ gameId, playerId, moveData }) {
    // moveData.fen = game.fen()
    // console.log(game.fen());
    socket.emit("make-move", { gameId, playerId, moveData })
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


    // console.log("moveFrom: ", moveFrom);

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
      const gameCopy = game;
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

      setGame(gameCopy);


      const moveData = {
        fen: gameCopy.fen(),
        from: moveFrom,
        to: moveTo,
        promotion: "q",
      }

      setTimeout(() => {
        makeMoveServer({ gameId, playerId, moveData })
      }, 100)

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
    // console.log(moveFrom, moveTo);
    // if no piece passed then user has cancelled dialog,
    // don't make move and reset
    const gameCopy = game; // Use spread operator or any other method to create a copy of game object
    if (piece) {

      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece.charAt(1).toLowerCase() ?? "q",
      });
      // validateGame(gameCopy)
      setGame(gameCopy);
    }

    const moveData = {
      fen: gameCopy.fen(),
      from: moveFrom,
      to: moveTo,
      promotion: piece[1]?.toLowerCase() ?? "q",
    }

    setTimeout(() => {
      makeMoveServer({ gameId, playerId, moveData })
    }, 1000)


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
      <Socket gameId={gameId} setGameId={setGameId} />

     
      {gameDetails &&
        <div className='max-w-3xl mx-auto md:mt-4 mt-32'>
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
            <p className='font-bold text-md font-sans'> { game.turn() == "b" ? "Black's turn to move" : "White's turn to move" } </p>
          </div>
        </div>
      }

      <dialog id="my_modal_2" className="modal border-green-200 border-2">
        <form method="dialog" className="modal-box border border-green-300">
          <h3 className="font-bold text-lg text-center">Hello! <span className='uppercase text-green-400'>{localStorage.getItem("userName")} </span></h3>
          <p className="py-4 text-center font-semibold text-[2rem] lg:text-[4rem]">{ gameEndCause }</p>
        </form>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}