package backend.repository.chat;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.chat.ChatRoom;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByRoomKey(String roomKey);
    Optional<ChatRoom> findByHireRequestId(Long hireRequestId);
    List<ChatRoom> findByGigId(Long gigId);
    List<ChatRoom> findByUserOne_IdOrUserTwo_Id(Long userOneId, Long userTwoId);
    List<ChatRoom> findByUserOne_IdOrUserTwo_Id(Long userOneId, Long userTwoId, Pageable pageable);
}
