import { useEffect, useRef, useState } from 'react';
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import Socket from './Socket';
import io from 'socket.io-client';
const apiUrl = 'http://localhost:3000';


export default function App() {
  const [game, setGame] = useState(new Chess());
  const chessboardRef = useRef(null);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});
  const [playerId] = useState(localStorage.getItem("playerId"))
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

  useEffect(() => {

    if (gameId) {
      socket.emit("get-game", { gameId: gameId })

      socket.on("game-details", ({data}) => {
        console.log(data);
        setGameId(data.gameId)
        setGameDetails(data)
        game.load(data.fen)
        localStorage.setItem("gameId", data.gameId)
      })
    }

  }, [gameId])

  socket.on("opponent-made-move" , ({ gameId , moveData})=> {
    console.log(gameId , moveData);
  })

  function onDrop(sourceSquare, targetSquare, piece) {

    if (game.turn() !== getColor().charAt(0)) return false;

    const gameCopy = new Chess(game.fen());

    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    });

    if (move === null) return false;

    validateGame(gameCopy)
    setGame(gameCopy);
  
    const moveData = {
      fen: gameCopy.fen(),
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    }

    socket.emit("make-move", { gameId , playerId , moveData })
    
    return true;
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
      validateGame(gameCopy)

      setGame(gameCopy);
      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  }


  function onSquareRightClick(square) {
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
    if (piece) {
      const gameCopy = game; // Use spread operator or any other method to create a copy of game object

      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece.charAt(1).toLowerCase() ?? "q",
      });
      validateGame(gameCopy)
      setGame(gameCopy);
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
  }


  function validateGame(game) {
    const isCheck = game.inCheck();
    const isCheckmate = game.isCheckmate();
    const isStalemate = game.isStalemate();
    const isDraw = game.isDraw();
    const hasInsufficientMaterial = game.isInsufficientMaterial();

    if (isCheck) {
      console.log("In check!");
      // Perform actions or handle UI updates for being in check
      // For example, change cell colors or display a message
    }

    if (isCheckmate) {
      console.log("Checkmate!");
      // Perform actions or handle UI updates for checkmate
    }

    if (isStalemate) {
      console.log("Stalemate!");
      // Perform actions or handle UI updates for stalemate
    }

    if (isDraw || hasInsufficientMaterial) {
      console.log("Draw or Insufficient Material!");
      // Perform actions or handle UI updates for draw/insufficient material
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

      {gameId &&
        <Chessboard
          id="PremovesEnabled"
          position={game.fen()}
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
      }
    </div>
  );
}