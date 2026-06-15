package backend.repository.chat;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.chat.ChatMessage;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatRoom_IdOrderBySentAtAsc(Long roomId);
    List<ChatMessage> findByChatRoom_IdOrderBySentAtDesc(Long roomId, Pageable pageable);
    Optional<ChatMessage> findTopByChatRoom_IdOrderBySentAtDesc(Long roomId);
    void deleteByChatRoom_IdIn(List<Long> roomIds);
}
